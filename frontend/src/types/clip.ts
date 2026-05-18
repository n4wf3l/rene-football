/* Mirrors App\Models\PlayerClip. The original video is NEVER stored -
   only the rendered PNG (`image_path`) plus a re-editable `annotations_json`. */

export interface ClipAnnotationArrow {
  type: 'arrow'
  /** All coordinates are stored as 0..1 ratios of the captured frame so the
     image keeps annotation parity at any displayed size. */
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  width?: number   // stroke width in px @ render time (relative to frame)
}

export type ClipAnnotation = ClipAnnotationArrow

export interface PlayerClip {
  id: number
  player_id: number
  image_path: string
  title: string
  timestamp_seconds: number | null
  video_source_label: string | null
  notes: string | null
  annotations_json: ClipAnnotation[] | null
  width: number | null
  height: number | null
  created_at?: string
  updated_at?: string
}
