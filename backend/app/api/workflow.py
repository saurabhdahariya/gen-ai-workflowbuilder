"""
Workflow execution API endpoints.
Handles workflow definition validation and execution orchestration.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import logging
import json
from datetime import datetime

from app.core.database import get_db
from app.models.database import WorkflowExecution
from app.models.schemas import (
    WorkflowExecutionRequest,
    WorkflowExecutionResponse,
    ErrorResponse
)
from app.services.orchestrator import Orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflow", tags=["workflow"])
orchestrator = Orchestrator()


@router.post("/execute", response_model=WorkflowExecutionResponse)
async def execute_workflow(
    request: WorkflowExecutionRequest,
    db: Session = Depends(get_db)
):
    """
    Execute a workflow with the given user query.
    
    Args:
        request: Workflow execution request with user query and workflow definition
        db: Database session
        
    Returns:
        Workflow execution response with AI-generated answer
        
    Raises:
        HTTPException: If workflow execution fails
    """
    try:
        # Validate request
        if not request.query.strip():
            raise HTTPException(
                status_code=400,
                detail="Query cannot be empty"
            )
        
        if not request.workflow.nodes:
            raise HTTPException(
                status_code=400,
                detail="Workflow must contain at least one node"
            )
        
        # Create workflow execution record
        workflow_execution = WorkflowExecution(
            user_id=request.user_id,
            workflow_config=json.dumps(request.workflow.dict()),
            input_query=request.query,
            status="running"
        )
        
        db.add(workflow_execution)
        db.commit()
        db.refresh(workflow_execution)
        
        try:
            # Execute workflow
            result = await orchestrator.execute_workflow(
                workflow_definition=request.workflow.dict(),
                user_query=request.query,
                user_id=request.user_id
            )
            
            # Update execution record with results
            if result["success"]:
                workflow_execution.output_response = result["response"]
                workflow_execution.execution_time_ms = result["execution_time_ms"]
                workflow_execution.status = "completed"
                workflow_execution.completed_at = datetime.utcnow()
            else:
                workflow_execution.error_message = result.get("error", "Unknown error")
                workflow_execution.execution_time_ms = result["execution_time_ms"]
                workflow_execution.status = "failed"
                workflow_execution.completed_at = datetime.utcnow()
            
            db.commit()
            
            if result["success"]:
                logger.info(f"Workflow executed successfully for user {request.user_id}")
                
                return WorkflowExecutionResponse(
                    execution_id=workflow_execution.id,
                    response=result["response"],
                    execution_time_ms=result["execution_time_ms"],
                    status="completed",
                    timestamp=workflow_execution.timestamp
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Workflow execution failed: {result.get('error', 'Unknown error')}"
                )
                
        except Exception as e:
            # Update execution record with error
            workflow_execution.error_message = str(e)
            workflow_execution.status = "failed"
            workflow_execution.completed_at = datetime.utcnow()
            db.commit()
            raise
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing workflow: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute workflow: {str(e)}"
        )


@router.get("/executions/{user_id}")
async def get_user_executions(
    user_id: str,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Get workflow execution history for a user.
    
    Args:
        user_id: ID of the user
        skip: Number of executions to skip
        limit: Maximum number of executions to return
        db: Database session
        
    Returns:
        List of workflow executions for the user
    """
    try:
        executions = (
            db.query(WorkflowExecution)
            .filter(WorkflowExecution.user_id == user_id)
            .order_by(WorkflowExecution.timestamp.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        
        return [
            {
                "id": execution.id,
                "input_query": execution.input_query,
                "output_response": execution.output_response,
                "execution_time_ms": execution.execution_time_ms,
                "status": execution.status,
                "timestamp": execution.timestamp,
                "completed_at": execution.completed_at,
                "error_message": execution.error_message
            }
            for execution in executions
        ]
        
    except Exception as e:
        logger.error(f"Error getting user executions: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve executions: {str(e)}"
        )


@router.get("/execution/{execution_id}")
async def get_execution_details(
    execution_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific workflow execution.
    
    Args:
        execution_id: ID of the execution
        db: Database session
        
    Returns:
        Detailed execution information including workflow configuration
        
    Raises:
        HTTPException: If execution not found
    """
    try:
        execution = db.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution_id
        ).first()
        
        if not execution:
            raise HTTPException(
                status_code=404,
                detail="Execution not found"
            )
        
        # Parse workflow configuration
        workflow_config = None
        try:
            workflow_config = json.loads(execution.workflow_config)
        except json.JSONDecodeError:
            logger.warning(f"Invalid workflow config for execution {execution_id}")
        
        return {
            "id": execution.id,
            "user_id": execution.user_id,
            "input_query": execution.input_query,
            "output_response": execution.output_response,
            "workflow_config": workflow_config,
            "execution_time_ms": execution.execution_time_ms,
            "status": execution.status,
            "timestamp": execution.timestamp,
            "completed_at": execution.completed_at,
            "error_message": execution.error_message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting execution details: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve execution details: {str(e)}"
        )


@router.post("/validate")
async def validate_workflow(workflow_definition: dict):
    """
    Validate a workflow definition without executing it.
    
    Args:
        workflow_definition: Workflow configuration to validate
        
    Returns:
        Validation result with any errors or warnings
    """
    try:
        # Create a temporary orchestrator instance for validation
        temp_orchestrator = Orchestrator()
        
        # Extract nodes and connections
        nodes = workflow_definition.get("nodes", [])
        connections = workflow_definition.get("connections", [])
        
        # Validate workflow structure
        temp_orchestrator._validate_workflow(nodes, connections)
        
        # Build execution graph to check for circular dependencies
        execution_graph = temp_orchestrator._build_execution_graph(nodes, connections)
        
        return {
            "valid": True,
            "message": "Workflow is valid",
            "execution_order": execution_graph["execution_order"],
            "node_count": len(nodes),
            "connection_count": len(connections)
        }
        
    except Exception as e:
        logger.warning(f"Workflow validation failed: {e}")
        return {
            "valid": False,
            "error": str(e),
            "message": "Workflow validation failed"
        }


@router.get("/stats")
async def get_workflow_stats(db: Session = Depends(get_db)):
    """
    Get statistics about workflow executions.
    
    Args:
        db: Database session
        
    Returns:
        Workflow execution statistics
    """
    try:
        total_executions = db.query(WorkflowExecution).count()
        completed_executions = db.query(WorkflowExecution).filter(
            WorkflowExecution.status == "completed"
        ).count()
        failed_executions = db.query(WorkflowExecution).filter(
            WorkflowExecution.status == "failed"
        ).count()
        
        # Calculate average execution time for completed workflows
        avg_execution_time = db.query(
            db.func.avg(WorkflowExecution.execution_time_ms)
        ).filter(
            WorkflowExecution.status == "completed"
        ).scalar()
        
        return {
            "total_executions": total_executions,
            "completed_executions": completed_executions,
            "failed_executions": failed_executions,
            "success_rate": completed_executions / total_executions if total_executions > 0 else 0,
            "average_execution_time_ms": int(avg_execution_time) if avg_execution_time else 0
        }
        
    except Exception as e:
        logger.error(f"Error getting workflow stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve workflow statistics: {str(e)}"
        )
