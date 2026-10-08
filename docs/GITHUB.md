# 팀 구조로 GitHub에 올리기

압축을 풀면 `07_local-host` 폴더가 나오고 그 안에 `backend`가 있습니다. GitHub 저장소 이름이 `07_local-host`라면 저장소 최상위에서 `backend`가 보여야 합니다. `07_local-host` 폴더의 내용물을 저장소에 대응시키세요. 저장소 안에 같은 이름의 폴더를 다시 만들 필요가 없습니다.

사진만 제공됐고 실제 저장소 주소는 없으므로 원격 커밋이나 push는 실행하지 않았습니다. ZIP에는 소스, 테스트, 설정, Maven Wrapper, GitHub Actions를 넣었습니다. 빌드 산출물과 Git 이력은 포함하지 않았습니다.

## 기존 팀 저장소

1. GitHub Desktop의 `File > Clone repository > URL`에 팀 저장소 주소를 넣고 내려받습니다.
2. `Current Branch > New Branch`에서 `feat/five-minute-stay` 브랜치를 만듭니다.
3. 새 `bapjul/stay`, `bapjul/location` 기능 폴더를 대응 경로에 추가합니다. 기존 `BapjulApplication.java`, `application.properties`, 빌드 파일은 [연동 안내](INTEGRATION.md)를 보고 필요한 변경만 합칩니다. 같은 경로에 기존 코드가 있다면 그 파일도 변경 내용을 비교해 합칩니다.
4. 팀이 사용하는 빌드 도구로 테스트합니다. 제공된 Maven 프로젝트 자체는 저장소 루트에서 `cd backend`, Windows는 `.\mvnw.cmd verify`, macOS/Linux는 `sh mvnw verify`입니다.
5. GitHub Desktop에서 변경 내용을 확인하고 Summary에 `feat: add five-minute stay restaurant recommendations`를 적은 뒤 Commit합니다.
6. 새 브랜치는 `Publish branch`, 이미 원격에 있는 브랜치는 `Push origin`으로 올립니다.
7. 팀의 검토 절차에 따라 Pull Request를 만듭니다.

팀 저장소가 아직 빈 상태라면 `07_local-host`의 내용물을 그대로 복사해 시작할 수 있습니다. 기존 앱에 다른 기능이 있다면 폴더 구조를 맞추는 것과 실제 기능 통합을 구분해서 진행하세요.

## 새 저장소

압축 속 `07_local-host` 폴더에서 다음 순서로 시작할 수 있습니다.

```bash
git init -b main
git add .
git diff --cached --check
git commit -m "feat: add five-minute stay restaurant recommendations"
```

GitHub에서 빈 저장소를 만든 뒤 실제 URL을 아래 자리에 넣습니다.

```bash
git remote add origin https://github.com/YOUR_ACCOUNT/07_local-host.git
git push -u origin main
```

Git 작성자 설정이 필요하면 본인 이름과 이메일을 사용하세요. `.gitignore`는 `target/`, DB 파일, `.env` 등을 제외합니다.

CI 파일은 저장소 루트의 `.github/workflows/java.yml`이며 `backend` 폴더에서 Maven을 실행합니다. 팀의 기존 CI가 있으면 그 설정과 합치세요. Android 예제는 앱 저장소에 연결할 참고 소스라서 이 Maven 빌드의 대상이 아닙니다.
