import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || '请求失败，请检查网络'
    return Promise.reject(new Error(msg))
  }
)

export default api

// Auth
export const authApi = {
  login: (data: { username: string; password: string; role?: string }) =>
    api.post('/auth/login', data),
  register: (data: { username: string; password: string; class_id: number }) =>
    api.post('/auth/register', data),
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
  me: () => api.get('/auth/me'),
}

// Classes
export const classApi = {
  list: () => api.get('/classes'),
  create: (name: string) => api.post('/classes', { name }),
  update: (id: number, name: string) => api.put(`/classes/${id}`, { name }),
  remove: (id: number) => api.delete(`/classes/${id}`),
  students: (id: number) => api.get(`/classes/${id}/students`),
}

// Users
export const userApi = {
  teachers: () => api.get('/users/teachers'),
  students: (class_id?: number) =>
    api.get('/users/students', { params: class_id ? { class_id } : {} }),
  studentsByClass: (class_id: number, search?: string) =>
    api.get(`/users/students/by-class/${class_id}`, { params: search ? { search } : {} }),
  createTeacher: (data: { username: string; password: string }) =>
    api.post('/users/teachers', data),
  createStudent: (data: { username: string; class_id?: number }) =>
    api.post('/users/students', data),
  updateTeacherClasses: (id: number, classes: any[]) =>
    api.put(`/users/teachers/${id}/classes`, { classes }),
  updateStudentClass: (id: number, class_id: number | null) =>
    api.put(`/users/students/${id}/class`, { class_id }),
  remove: (id: number) => api.delete(`/users/${id}`),
  resetPassword: (id: number) => api.post(`/users/${id}/reset-password`),
}

// Questions
export const questionApi = {
  sets: () => api.get('/questions/sets'),
  set: (id: number) => api.get(`/questions/sets/${id}`),
  createSet: (data: { title?: string; is_single?: boolean }) =>
    api.post('/questions/sets', data),
  updateSet: (id: number, title: string) => api.put(`/questions/sets/${id}`, { title }),
  removeSet: (id: number) => api.delete(`/questions/sets/${id}`),
  createQuestion: (setId: number, data: any) =>
    api.post(`/questions/sets/${setId}/questions`, data),
  updateQuestion: (id: number, data: any) => api.put(`/questions/questions/${id}`, data),
  removeQuestion: (id: number) => api.delete(`/questions/questions/${id}`),
  reorder: (setId: number, orders: { id: number; sort_order: number }[]) =>
    api.post(`/questions/sets/${setId}/reorder`, { orders }),
}

// Sessions
export const sessionApi = {
  list: (class_id?: number) =>
    api.get('/sessions', { params: class_id ? { class_id } : {} }),
  active: () => api.get('/sessions/active'),
  get: (id: number) => api.get(`/sessions/${id}`),
  create: (data: any) => api.post('/sessions', data),
  update: (id: number, data: any) => api.put(`/sessions/${id}`, data),
  remove: (id: number) => api.delete(`/sessions/${id}`),
}

// Submissions
export const submissionApi = {
  my: (sessionId: number) => api.get(`/submissions/my/${sessionId}`),
  save: (sessionId: number, answers: Record<string, any>) =>
    api.post(`/submissions/${sessionId}`, { answers }),
  submit: (sessionId: number, answers: Record<string, any>) =>
    api.post(`/submissions/${sessionId}/submit`, { answers }),
  sessionResults: (sessionId: number) => api.get(`/submissions/session/${sessionId}`),
  getOne: (assignmentId: number) => api.get(`/submissions/by-assignment/${assignmentId}`),
}

// Evaluations
export const evalApi = {
  getDimensions: (sessionId: number) =>
    api.get(`/evaluations/sessions/${sessionId}/dimensions`),
  saveDimensions: (sessionId: number, dimensions: any[]) =>
    api.post(`/evaluations/sessions/${sessionId}/dimensions`, { dimensions }),
  getMySelfEval: (sessionId: number) =>
    api.get(`/evaluations/sessions/${sessionId}/self-eval/my`),
  submitSelfEval: (sessionId: number, evaluations: any[]) =>
    api.post(`/evaluations/sessions/${sessionId}/self-eval`, { evaluations }),
  getAllSelfEvals: (sessionId: number) =>
    api.get(`/evaluations/sessions/${sessionId}/self-eval`),
  assignPeerEval: (sessionId: number) =>
    api.post(`/evaluations/sessions/${sessionId}/peer-eval/assign`),
  getMyPeerTask: (sessionId: number) =>
    api.get(`/evaluations/sessions/${sessionId}/peer-eval/my-task`),
  getMyPeerTasks: (sessionId: number) =>
    api.get(`/evaluations/sessions/${sessionId}/peer-eval/my-tasks`),
  submitPeerScore: (sessionId: number, reviewee_id: number, score: number) =>
    api.post(`/evaluations/sessions/${sessionId}/peer-eval/score`, { reviewee_id, score }),
  submitPeerEval: (assignmentId: number, data: { score: number; comment?: string }) =>
    api.post(`/evaluations/peer-eval/${assignmentId}/score`, data),
  getMyPeerResult: (sessionId: number) =>
    api.get(`/evaluations/sessions/${sessionId}/peer-eval/my-result`),
  getMyGrade: (sessionId: number) =>
    api.get(`/evaluations/sessions/${sessionId}/grade/my`),
  getAllPeerEvals: (sessionId: number) =>
    api.get(`/evaluations/sessions/${sessionId}/peer-eval`),
  getGrades: (sessionId: number) =>
    api.get(`/evaluations/sessions/${sessionId}/grades`),
}

// Upload
export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  const res: any = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.url
}
