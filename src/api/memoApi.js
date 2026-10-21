// 08-3 Spring Boot 메모 API 호출 모음 (axios + async/await)
//
//   GET    /memos        : 메모 전체 조회
//   GET    /memos/{id}   : 메모 1개 조회
//   POST   /memos        : 메모 저장   (본문: {"content": "..."}, 성공 201)
//   DELETE /memos/{id}   : 메모 삭제   (성공 204, 없으면 404)
//   GET    /actuator/health : 앱 + DB 상태
//
// - 모든 요청은 /api 로 시작
//   개발: Vite 프록시, 배포: nginx 가 Spring Boot 로 전달 (vite.config.js, nginx.conf)
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
})

// 메모 전체 조회
export async function fetchMemos() {
  const response = await api.get('/memos')
  return response.data
}

// 메모 저장 → 저장된 메모(id, createdAt 포함) 반환
export async function createMemo(content) {
  const response = await api.post('/memos', { content })
  return response.data
}

// 메모 삭제 (응답 본문 없음)
export async function deleteMemo(id) {
  await api.delete(`/memos/${id}`)
}

// 앱 상태 조회
// - DB가 끊기면 Spring Boot 가 503 + {"status":"DOWN", ...} 을 돌려주므로
//   503 도 정상 응답처럼 받아서 본문을 그대로 사용
export async function fetchHealth() {
  const response = await api.get('/actuator/health', {
    validateStatus: (status) => status === 200 || status === 503,
  })
  return response.data
}

// 오류를 화면에 보여줄 문장으로 바꾸기
// - 서버가 응답한 경우: Spring Boot 기본 오류 본문의 message 또는 상태 코드
// - 서버에 닿지 못한 경우: 백엔드가 꺼져 있을 가능성이 큼
export function toErrorMessage(error) {
  if (error.response) {
    const { status, data } = error.response
    if (status === 502 || status === 504) {
      return '백엔드에 연결할 수 없습니다. Spring Boot 앱이 실행 중인지 확인하세요.'
    }
    return data?.message || `요청 실패 (HTTP ${status})`
  }
  if (error.code === 'ECONNABORTED') {
    return '응답 시간이 초과되었습니다.'
  }
  return '백엔드에 연결할 수 없습니다. Spring Boot 앱이 실행 중인지 확인하세요.'
}
