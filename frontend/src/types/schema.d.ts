export interface Role {
  id: string;
  name: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  name: string;
  created_at?: string;
}

export interface User {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string;
  is_active: boolean;
  role?: string; // Derived / joined
}

export interface Course {
  id: string;
  course_code: string;
  title: string;
  description: string;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced';
  is_published: boolean;
  duration?: string;
  created_by?: string;
  created_at?: string;
  is_mandatory?: boolean;
  published_at?: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string;
  sequence_no: number;
  tier: 'beginner' | 'intermediate' | 'advanced';
}

export interface ModuleContent {
  id: string;
  module_id: string;
  title: string;
  content_type: 'video' | 'document' | 'quiz' | 'article';
  file_path: string;
  duration_seconds: number;
  sequence_no: number;
  is_active: boolean;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  progress_percent: number;
  enrolled_at: string;
  completed_at?: string;
  expires_at?: string;
  is_locked: boolean;
  progress_records?: any[];
}

export interface UserCourseSummary {
  user_id: string;
  course_id: string;
  completion_percent: number;
  time_spent_seconds: number;
  best_quiz_score?: number;
  last_updated: string;
}

export interface Quiz {
  id: string;
  module_id: string;
  title: string;
  passing_score: number; // percentage
  time_limit_minutes: number;
  is_published: boolean;
}
