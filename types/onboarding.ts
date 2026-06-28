export type TourId = 'home' | 'project'

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export type TourStep = {
  /** Unique step identifier */
  id: string
  /** Matches a data-tour="..." attribute in the DOM; omit for centered, non-spotlight steps */
  target?: string
  /** Step title displayed in the tooltip card */
  title: string
  /** Step body copy displayed in the tooltip card */
  body: string
  /** Tooltip placement relative to the target element */
  placement?: TourPlacement
  /** Key into the action map supplied by the host, called when entering this step */
  onEnterActionId?: string
  /** Key into the action map supplied by the host, called when exiting this step */
  onExitActionId?: string
}

export type TourDefinition = {
  id: TourId
  steps: TourStep[]
}
