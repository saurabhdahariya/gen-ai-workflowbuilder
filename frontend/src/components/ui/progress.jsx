import * as React from "react"
import { cn } from "../../lib/utils"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
      className
    )}
    {...props}
  >
    <div
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
))
Progress.displayName = "Progress"

const ProgressStep = ({ step, currentStep, title, description, isCompleted, isError }) => {
  const getStepStatus = () => {
    if (isError) return 'error'
    if (isCompleted) return 'completed'
    if (currentStep === step) return 'active'
    if (currentStep > step) return 'completed'
    return 'pending'
  }

  const status = getStepStatus()

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white'
      case 'active':
        return 'bg-blue-500 text-white animate-pulse'
      case 'error':
        return 'bg-red-500 text-white'
      default:
        return 'bg-gray-200 text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return '✓'
      case 'active':
        return '⟳'
      case 'error':
        return '✗'
      default:
        return step
    }
  }

  return (
    <div className="flex items-center space-x-3">
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
        getStatusColor()
      )}>
        {getStatusIcon()}
      </div>
      <div className="flex-1">
        <div className={cn(
          "text-sm font-medium",
          status === 'completed' ? 'text-green-700' : 
          status === 'active' ? 'text-blue-700' :
          status === 'error' ? 'text-red-700' : 'text-gray-500'
        )}>
          {title}
        </div>
        {description && (
          <div className="text-xs text-gray-500 mt-1">
            {description}
          </div>
        )}
      </div>
    </div>
  )
}

const ProgressIndicator = ({ 
  steps = [], 
  currentStep = 0, 
  title = "Processing...",
  showProgress = true,
  className 
}) => {
  const progress = steps.length > 0 ? (currentStep / steps.length) * 100 : 0

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{title}</h3>
        {showProgress && (
          <span className="text-sm text-gray-500">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      
      {showProgress && (
        <Progress value={progress} className="h-2" />
      )}
      
      <div className="space-y-3">
        {steps.map((step, index) => (
          <ProgressStep
            key={index}
            step={index + 1}
            currentStep={currentStep}
            title={step.title}
            description={step.description}
            isCompleted={step.isCompleted}
            isError={step.isError}
          />
        ))}
      </div>
    </div>
  )
}

export { Progress, ProgressStep, ProgressIndicator }
