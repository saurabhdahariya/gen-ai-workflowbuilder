"""
Workflow orchestrator service for executing AI workflows.
Processes user queries through defined workflow nodes and connections.
"""

import openai
import requests
import json
import time
from typing import Dict, List, Any, Optional, Tuple
import logging
from datetime import datetime
from urllib.parse import quote_plus

from app.core.config import settings
from app.services.vector_service_manager import get_shared_vector_service
from app.services.web_search_service import web_search_service

logger = logging.getLogger(__name__)


class Orchestrator:
    """Service for orchestrating AI workflow execution."""
    
    def __init__(self):
        """Initialize orchestrator with required services."""
        # Set OpenAI API key
        openai.api_key = settings.openai_api_key
        
        # Get shared vector service instance
        self.vector_service = get_shared_vector_service()
        logger.info(f"Using {type(self.vector_service).__name__} for orchestrator")
        
        # Node type handlers
        self.node_handlers = {
            "user_query": self._handle_user_query,
            "knowledge_base": self._handle_knowledge_base,
            "llm_engine": self._handle_llm_engine,
            "output": self._handle_output
        }
    
    async def execute_workflow(
        self, 
        workflow_definition: Dict[str, Any], 
        user_query: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Execute a complete workflow with the given user query.
        
        Args:
            workflow_definition: Workflow configuration with nodes and connections
            user_query: User's input query
            user_id: ID of the user executing the workflow
            
        Returns:
            Dictionary with execution results
            
        Raises:
            Exception: If workflow execution fails
        """
        start_time = time.time()
        
        try:
            # Parse workflow definition
            nodes = workflow_definition.get("nodes", [])
            connections = workflow_definition.get("connections", [])
            
            # Validate workflow
            self._validate_workflow(nodes, connections)
            
            # Build execution graph
            execution_graph = self._build_execution_graph(nodes, connections)
            
            # Initialize execution context
            context = {
                "user_query": user_query,
                "user_id": user_id,
                "workflow_data": {},
                "execution_log": []
            }
            
            # Execute workflow nodes in order
            result = await self._execute_workflow_graph(execution_graph, context)

            execution_time = int((time.time() - start_time) * 1000)

            return {
                "success": True,
                "response": context.get("final_response", "No response generated"),
                "execution_time_ms": execution_time,
                "execution_log": context["execution_log"],
                "workflow_data": context["workflow_data"]
            }
            
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            logger.error(f"Workflow execution failed: {e}")
            
            return {
                "success": False,
                "error": str(e),
                "execution_time_ms": execution_time,
                "execution_log": context.get("execution_log", []) if 'context' in locals() else []
            }
    
    def _validate_workflow(self, nodes: List[Dict], connections: List[Dict]) -> None:
        """
        Validate workflow structure and requirements.
        
        Args:
            nodes: List of workflow nodes
            connections: List of node connections
            
        Raises:
            ValueError: If workflow is invalid
        """
        if not nodes:
            raise ValueError("Workflow must contain at least one node")
        
        # Check for required node types
        node_types = [node.get("type") for node in nodes]
        required_types = ["user_query", "output"]
        
        for required_type in required_types:
            if required_type not in node_types:
                raise ValueError(f"Workflow must contain a '{required_type}' node")
        
        # Validate node IDs are unique
        node_ids = [node.get("id") for node in nodes]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError("All node IDs must be unique")
        
        # Validate connections reference existing nodes
        for connection in connections:
            source = connection.get("source")
            target = connection.get("target")
            
            if source not in node_ids:
                raise ValueError(f"Connection source '{source}' not found in nodes")
            if target not in node_ids:
                raise ValueError(f"Connection target '{target}' not found in nodes")
    
    def _build_execution_graph(self, nodes: List[Dict], connections: List[Dict]) -> Dict[str, Any]:
        """
        Build execution graph from nodes and connections.
        
        Args:
            nodes: List of workflow nodes
            connections: List of node connections
            
        Returns:
            Execution graph with node order and dependencies
        """
        # Create node lookup
        node_lookup = {node["id"]: node for node in nodes}
        
        # Build adjacency list
        graph = {node["id"]: [] for node in nodes}
        for connection in connections:
            graph[connection["source"]].append(connection["target"])
        
        # Find execution order using topological sort
        execution_order = self._topological_sort(graph)
        
        return {
            "nodes": node_lookup,
            "execution_order": execution_order,
            "connections": connections
        }
    
    def _topological_sort(self, graph: Dict[str, List[str]]) -> List[str]:
        """
        Perform topological sort to determine execution order.
        
        Args:
            graph: Adjacency list representation of the graph
            
        Returns:
            List of node IDs in execution order
        """
        # Calculate in-degrees
        in_degree = {node: 0 for node in graph}
        for node in graph:
            for neighbor in graph[node]:
                in_degree[neighbor] += 1
        
        # Find nodes with no incoming edges
        queue = [node for node in in_degree if in_degree[node] == 0]
        result = []
        
        while queue:
            node = queue.pop(0)
            result.append(node)
            
            # Remove edges from this node
            for neighbor in graph[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        if len(result) != len(graph):
            raise ValueError("Workflow contains circular dependencies")
        
        return result
    
    async def _execute_workflow_graph(
        self, 
        execution_graph: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute workflow nodes in the determined order.
        
        Args:
            execution_graph: Execution graph with nodes and order
            context: Execution context
            
        Returns:
            Final execution result
        """
        nodes = execution_graph["nodes"]
        execution_order = execution_graph["execution_order"]
        
        for node_id in execution_order:
            node = nodes[node_id]
            node_type = node.get("type")
            
            logger.info(f"Executing node: {node_id} (type: {node_type})")
            
            # Execute node handler
            if node_type in self.node_handlers:
                result = await self.node_handlers[node_type](node, context)
                context["workflow_data"][node_id] = result
                
                # Log execution
                context["execution_log"].append({
                    "node_id": node_id,
                    "node_type": node_type,
                    "timestamp": datetime.utcnow().isoformat(),
                    "status": "completed"
                })
            else:
                raise ValueError(f"Unknown node type: {node_type}")
        
        return context["workflow_data"]
    
    async def _handle_user_query(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user query node."""
        return {
            "query": context["user_query"],
            "user_id": context["user_id"],
            "processed": True
        }
    
    async def _handle_knowledge_base(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle knowledge base node for context retrieval."""
        try:
            node_data = node.get("data", {})
            config = node_data.get("config", {})

            # Get configuration from the new frontend format
            selected_documents = config.get("selectedDocuments", [])
            max_results = config.get("maxResults", 5)
            similarity_threshold = config.get("similarityThreshold", 0.5)  # Lower default threshold

            # Also check for documentId (single document format)
            document_id = config.get("documentId")
            if document_id and document_id not in selected_documents:
                selected_documents.append(document_id)

            logger.info(f"🔍 Knowledge base processing: {len(selected_documents)} documents selected, max_results={max_results}")
            logger.info(f"📋 Selected documents: {selected_documents}")
            logger.info(f"🎯 User query: '{context['user_query']}'")

            all_relevant_chunks = []
            context_texts = []

            # If no documents selected, try to get all available documents
            if not selected_documents:
                logger.info("No documents selected, searching all available documents")
                relevant_chunks = await self.vector_service.get_relevant_context(
                    query=context["user_query"],
                    document_id=None,  # Search all documents
                    n_results=max_results,
                    similarity_threshold=0.5  # Lower threshold for better results
                )
                all_relevant_chunks.extend(relevant_chunks)
            else:
                # Search each selected document
                for doc_id in selected_documents:
                    logger.info(f"🔍 Searching document {doc_id} for query: '{context['user_query']}'")
                    relevant_chunks = await self.vector_service.get_relevant_context(
                        query=context["user_query"],
                        document_id=doc_id,
                        n_results=max_results // len(selected_documents) + 1,
                        similarity_threshold=0.5  # Lower threshold for better results
                    )
                    logger.info(f"📄 Found {len(relevant_chunks)} chunks from document {doc_id}")

                    # Log chunk details for debugging
                    for i, chunk in enumerate(relevant_chunks):
                        score = chunk.get('similarity_score', chunk.get('score', 0))
                        logger.info(f"   📝 Chunk {i+1}: score={score:.3f}, text_preview='{chunk.get('text', '')[:100]}...'")

                    all_relevant_chunks.extend(relevant_chunks)

            # Filter by similarity threshold and sort by relevance
            filtered_chunks = [
                chunk for chunk in all_relevant_chunks
                if chunk.get("similarity_score", chunk.get("score", 0)) >= similarity_threshold
            ]

            # Sort by relevance score (descending) and limit results
            filtered_chunks.sort(key=lambda x: x.get("similarity_score", x.get("score", 0)), reverse=True)
            final_chunks = filtered_chunks[:max_results]

            # Combine relevant text chunks
            context_texts = [chunk["text"] for chunk in final_chunks if chunk.get("text")]
            context_text = "\n\n".join(context_texts)

            logger.info(f"📊 Knowledge base processing complete:")
            logger.info(f"   • Total chunks found: {len(all_relevant_chunks)}")
            logger.info(f"   • Chunks after filtering: {len(filtered_chunks)}")
            logger.info(f"   • Final chunks used: {len(final_chunks)}")
            logger.info(f"   • Context text length: {len(context_text)} characters")

            if context_text:
                logger.info(f"📄 Context preview: '{context_text[:200]}...'")
            else:
                logger.warning("⚠️  NO CONTEXT FOUND - This will cause generic LLM responses!")

            return {
                "context": context_text,
                "relevant_chunks": final_chunks,
                "selected_documents": selected_documents,
                "chunks_found": len(final_chunks),
                "similarity_threshold": similarity_threshold
            }

        except Exception as e:
            logger.error(f"Knowledge base node error: {e}")
            return {
                "context": "",
                "relevant_chunks": [],
                "error": str(e)
            }
    
    async def _handle_llm_engine(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle LLM engine node for AI response generation."""
        try:
            node_data = node.get("data", {})
            config = node_data.get("config", {})

            model = config.get("model", "gpt-3.5-turbo")
            temperature = config.get("temperature", 0.7)
            max_tokens = config.get("maxTokens", 1000)
            enable_web_search = config.get("enableWebSearch", False)
            system_prompt_custom = config.get("systemPrompt", "")
            user_api_key = config.get("apiKey", "")  # Get user's API key from LLM node

            # Build prompt
            user_query = context["user_query"]
            knowledge_context = ""
            knowledge_chunks = []

            # Get context from knowledge base node if available
            for node_id, node_result in context["workflow_data"].items():
                if isinstance(node_result, dict) and "context" in node_result:
                    knowledge_context = node_result["context"]
                    knowledge_chunks = node_result.get("relevant_chunks", [])
                    logger.info(f"✅ Found knowledge context: {len(knowledge_chunks)} chunks, {len(knowledge_context)} characters")
                    break

            # If no knowledge context found, log it
            if not knowledge_context:
                logger.warning("⚠️ No knowledge base context found in workflow data")
                logger.info(f"Available workflow data keys: {list(context['workflow_data'].keys())}")
                for k, v in context["workflow_data"].items():
                    if isinstance(v, dict):
                        logger.info(f"Node {k} output keys: {list(v.keys())}")

            # Perform web search if enabled
            web_context = ""
            if enable_web_search:
                web_context = await self._perform_web_search(user_query)
                logger.info(f"Web search context: {len(web_context)} characters")

            # Construct system prompt
            system_prompt = self._build_system_prompt(knowledge_context, web_context, system_prompt_custom)

            logger.info(f"LLM processing: model={model}, has_knowledge={bool(knowledge_context)}, has_web={bool(web_context)}")

            # Validate API key
            if not user_api_key:
                raise ValueError("OpenAI API key is required. Please enter your API key in the LLM Engine node.")

            # Call OpenAI API with user's key
            from openai import OpenAI
            client = OpenAI(api_key=user_api_key)

            # Prepare user message with context if available
            if knowledge_context:
                user_message = f"""Context from uploaded documents:
{knowledge_context}

Question: {user_query}

Please answer the question using ONLY the context provided above. If the answer is not in the context, please say "I don't have that information in the uploaded documents." Do not use your general knowledge."""
                logger.info(f"📤 Sending {len(knowledge_context)} characters of context to LLM")
                logger.info(f"📄 Context being sent: '{knowledge_context[:300]}...'")
            else:
                user_message = user_query
                logger.warning("⚠️  NO CONTEXT AVAILABLE - LLM will give generic responses!")

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )

            ai_response = response.choices[0].message.content

            logger.info(f"LLM response generated: {len(ai_response)} characters, {response.usage.total_tokens} tokens")

            return {
                "response": ai_response,
                "model": model,
                "tokens_used": response.usage.total_tokens,
                "has_knowledge_context": bool(knowledge_context),
                "has_web_context": bool(web_context),
                "knowledge_chunks_used": len(knowledge_chunks),
                "system_prompt_length": len(system_prompt)
            }

        except Exception as e:
            logger.error(f"LLM engine node error: {e}")
            return {
                "response": f"Error generating AI response: {str(e)}",
                "error": str(e)
            }
    
    async def _handle_output(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle output node for final response formatting."""
        # Get AI response from LLM engine node
        ai_response = ""
        for node_id, node_result in context["workflow_data"].items():
            if isinstance(node_result, dict) and "response" in node_result:
                ai_response = node_result["response"]
                break
        
        # Store final response in context
        context["final_response"] = ai_response
        
        return {
            "final_response": ai_response,
            "formatted": True
        }
    
    def _build_system_prompt(self, knowledge_context: str, web_context: str, custom_prompt: str = "") -> str:
        """Build system prompt with available context."""

        # Start with custom prompt if provided, otherwise use default
        if custom_prompt.strip():
            prompt_parts = [custom_prompt.strip()]
        else:
            if knowledge_context or web_context:
                prompt_parts = [
                    "You are a helpful AI assistant. You MUST use ONLY the context provided below to answer questions. "
                    "DO NOT use your general knowledge or training data. "
                    "If the answer is not found in the provided context, respond with 'I don't have that information in the uploaded documents.' "
                    "Always base your answers strictly on the provided context."
                ]
            else:
                prompt_parts = [
                    "You are a helpful AI assistant. Answer the user's question to the best of your ability."
                ]

        # Add knowledge base context if available
        if knowledge_context:
            prompt_parts.append(f"\n--- KNOWLEDGE BASE CONTEXT ---\n{knowledge_context}")
            prompt_parts.append("--- END KNOWLEDGE BASE CONTEXT ---")

        # Add web search context if available
        if web_context:
            prompt_parts.append(f"\n--- WEB SEARCH CONTEXT ---\n{web_context}")
            prompt_parts.append("--- END WEB SEARCH CONTEXT ---")

        # Add instructions for using context
        if knowledge_context or web_context:
            prompt_parts.append(
                "\nCRITICAL INSTRUCTIONS:"
                "\n- ONLY use information from the context provided above"
                "\n- DO NOT use any information from your training data"
                "\n- If the context contains the answer, use it exactly as provided"
                "\n- If the context doesn't contain the answer, say 'I don't have that information in the uploaded documents.'"
                "\n- Be specific and accurate based only on the provided context"
                "\n- Do not make assumptions or add information not in the context"
            )

        return "\n".join(prompt_parts)
    
    async def _perform_web_search(self, query: str, max_results: int = 3) -> str:
        """
        Perform web search using configured provider (SerpAPI/Brave).

        Args:
            query: Search query
            max_results: Maximum number of results to include

        Returns:
            Formatted web search results
        """
        try:
            logger.info(f"Web search requested for: {query}")

            # Use the web search service
            formatted_results = await web_search_service.search_and_format(query, max_results)

            if formatted_results:
                logger.info(f"Web search completed: {len(formatted_results)} characters")
                return formatted_results
            else:
                logger.info("Web search returned no results")
                return f"Web search performed for '{query}' but no results available."

        except Exception as e:
            logger.error(f"Web search error: {e}")
            return f"Web search attempted for '{query}' but encountered an error."
