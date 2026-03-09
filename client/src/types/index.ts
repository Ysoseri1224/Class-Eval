export interface User {
  id: number
  username: string
  role: 'admin' | 'teacher' | 'student'
  class_id?: number | null
}

export interface Class {
  id: number
  name: string
  created_at?: string
}

export interface TeacherClass {
  id: number
  name: string
  permission: 'view' | 'edit'
  is_head_teacher: number
}

export interface Teacher extends User {
  classes: TeacherClass[]
}

export interface Student extends User {
  class_name?: string
}

export type QuestionType = 'choice' | 'judge' | 'fill'

export interface Question {
  id: number
  set_id: number
  question_no: string
  type: QuestionType
  content: string
  options: any | null
  answer: any
  score: number
  sort_order: number
}

export interface QuestionSet {
  id: number
  title: string | null
  is_single: number
  created_by: number
  created_by_name?: string
  question_count?: number
  questions?: Question[]
  created_at?: string
}

export interface Session {
  id: number
  title: string | null
  class_id: number
  class_name?: string
  question_set_id: number
  question_set_title?: string
  status: 'draft' | 'open' | 'closed'
  exam_open: number
  self_eval_open: number
  peer_eval_open: number
  duration_minutes: number | null
  start_time: string | null
  end_time: string | null
  created_by: number
  created_by_name?: string
  created_at?: string
}

export interface Submission {
  id: number
  session_id: number
  student_id: number
  username?: string
  answers: Record<string, any>
  score: number
  submitted_at: string | null
  status: 'in_progress' | 'submitted'
}

export interface SelfEvalDimension {
  id: number
  session_id: number
  dimension_name: string
  level_20: string
  level_40: string
  level_60: string
  level_80: string
  level_100: string
  sort_order: number
}

export interface SelfEvaluation {
  id: number
  session_id: number
  student_id: number
  dimension_id: number
  dimension_name?: string
  score: number
}

export interface PeerEvalAssignment {
  id: number
  session_id: number
  reviewer_id: number
  reviewer_name?: string
  reviewee_id: number
  reviewee_name?: string
  score: number | null
  status: 'pending' | 'submitted'
  answers?: Record<string, any>
  submitted_at?: string
}

export interface GradeResult {
  student_id: number
  username: string
  exam_score: number | null
  submitted: boolean
  self_grade: 'A' | 'B' | 'C' | null
  peer_score: number | null
  peer_grade: 'A' | 'B' | 'C' | null
}

export interface QuestionStat {
  question_id: number
  question_no: string
  type: QuestionType
  correct_count: number
  total_submitted: number
  excellent_rate: string
}
