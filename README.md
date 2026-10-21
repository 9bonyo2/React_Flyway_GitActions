# 07-2-react_memo_client

08-3-springboot-flyway-dockercompose(Spring Boot + Flyway + MariaDB) 메모 API를 사용하는 **React(Vite) 클라이언트**입니다.

## 화면 기능

| 기능 | 호출하는 API |
|---|---|
| 메모 목록 (최신순) | `GET /memos` |
| 메모 저장 (500자 제한, Ctrl+Enter) | `POST /memos` |
| 메모 삭제 (확인 후) | `DELETE /memos/{id}` |
| 앱 / DB 상태 배지 (10초마다 확인) | `GET /actuator/health` |

작성 시각과 다를 때는 V3 마이그레이션으로 추가된 `updatedAt`(수정 시각)도 표시합니다.

## 파일 구성

```
07-2-react_memo_client/
├── .env.development              # 개발 서버가 연결할 Spring Boot 주소
├── vite.config.js                # /api 프록시 설정
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx                   # 메모 상태 관리 (목록, 저장, 삭제)
│   ├── index.css                 # 밝은/어두운 테마
│   ├── api/
│   │   └── memoApi.js            # axios 호출 모음 (async/await)
│   └── components/
│       ├── HealthBadge.jsx       # 앱/DB 상태
│       ├── MemoForm.jsx          # 입력 폼
│       ├── MemoList.jsx          # 목록
│       └── MemoItem.jsx          # 메모 1개
├── Dockerfile                    # Node 빌드 → nginx 실행
├── nginx/default.conf.template   # 정적 파일 + /api 를 Spring Boot 로 전달
└── .github/workflows/docker.yml  # GitHub Actions (빌드 + Docker Hub push)
```

* * *

## 핵심 개념: CORS 없이 연결하기 (프록시)

08-3 Spring Boot 앱에는 CORS 설정이 없습니다. 브라우저가 `localhost:5173`(React)에서 `localhost:8080`(Spring Boot)으로 바로 요청하면 **출처(origin)가 달라서 차단**됩니다.

그래서 React는 항상 **자기 주소의 `/api`** 로만 요청하고, 중간에서 Spring Boot로 전달합니다.

```
[개발]  브라우저 → localhost:5173/api/memos → (Vite 프록시)  → localhost:8080/memos
[배포]  브라우저 → localhost:3000/api/memos → (nginx)        → app:8080/memos
```

| 구분 | 전달하는 쪽 | 설정 파일 | Spring Boot 주소 |
|---|---|---|---|
| 개발 (`npm run dev`) | Vite 개발 서버 | `vite.config.js` | `.env.development`의 `VITE_API_TARGET` |
| 배포 (Docker) | nginx | `nginx/default.conf.template` | 환경 변수 `BACKEND_URL` (기본 `http://app:8080`) |

브라우저 입장에서는 같은 출처라서 백엔드 코드를 고칠 필요가 없습니다.

* * *

## 실행 방법 1: 개발 서버

```bash
# 0. 백엔드 먼저 실행 (08-3 폴더에서)
docker compose up -d --build
curl http://localhost:8080/memos      # 응답이 오는지 확인

# 1. 클라이언트 실행 (이 폴더에서)
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

> 08-3 `compose.yaml`의 app 포트는 `"8080:8080"`입니다. 포트를 `"8093:8080"`처럼 바꿨다면 `.env.development`의 `VITE_API_TARGET`도 같은 포트로 바꾸고 `npm run dev`를 다시 실행하세요.

## 실행 방법 2: Docker Compose로 함께 실행

08-3의 `compose.yaml` `services:` 아래에 `web` 서비스를 추가합니다.

```yaml
  # --------------------------------------------------------
  # React 클라이언트 (nginx)
  # --------------------------------------------------------
  web:
    # 방법 A: 옆 폴더의 소스로 빌드
    build: ../07-2-react_memo_client
    image: boot-flyway-web
    # 방법 B: Docker Hub 이미지 사용 (build 줄을 지우고)
    # image: 아이디/boot-flyway-web:latest

    environment:
      BACKEND_URL: http://app:8080   # 같은 compose 네트워크의 서비스 이름
    ports:
      - "3000:80"
    depends_on:
      - app
    restart: unless-stopped
```

```bash
docker compose up -d --build
```

브라우저에서 http://localhost:3000 을 엽니다.

| 컨테이너 | 내 PC 포트 | 역할 |
|---|---|---|
| web | 3000 | React 화면 + `/api` 전달 |
| app | 8080 | Spring Boot API |
| mariadb | 3307 | DB (Flyway가 테이블 관리) |

nginx가 `app:8080`으로 전달하므로, 화면만 쓴다면 app의 `ports:`는 없어도 됩니다.

## GitHub Actions

`.github/workflows/docker.yml`은 08-3의 `maven.yml`과 같은 구조입니다.

- PR: `npm run build`로 빌드만 확인
- main push: Docker Hub에 `아이디/boot-flyway-web:v1`, `:latest` push

저장소 Settings > Secrets에 `DOCKER_USERNAME`, `DOCKER_PASSWORD`(Access Token)를 등록해야 합니다.

## 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| "백엔드에 연결할 수 없습니다" | Spring Boot가 꺼져 있거나 포트가 다름 | `curl http://localhost:8080/memos` 확인, `.env.development` 포트 확인 |
| 상태 배지가 `DB DOWN` | MariaDB 연결 끊김 | 08-3에서 `docker compose logs mariadb` |
| 브라우저 콘솔에 CORS 오류 | axios 주소에 `http://localhost:8080`을 직접 씀 | `baseURL`은 `/api` 그대로 두기 |
| Docker로 실행 시 502 Bad Gateway | nginx가 app을 찾지 못함 | web과 app이 같은 compose에 있는지, `BACKEND_URL` 확인 |
| `.env.development`를 바꿨는데 그대로 | Vite는 시작할 때만 읽음 | `npm run dev` 다시 실행 |
| 저장 시 "요청 실패 (HTTP 400)" | 빈 내용 | 내용을 입력 (서버도 빈 값은 거절) |

## 버전 참고

- React 19, Vite 8, axios 1
- Node 22 (Dockerfile, GitHub Actions)
