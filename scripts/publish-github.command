#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/artifacts"
LOG_FILE="$LOG_DIR/publish-github.log"
LOCAL_TOOLS_DIR="$PROJECT_ROOT/.local-tools"
GITHUB_OWNER="ireneliu1810-collab"
GITHUB_REPO="quiet-tidy-house-pico"
GITHUB_FULL_NAME="$GITHUB_OWNER/$GITHUB_REPO"
GITHUB_URL="https://github.com/$GITHUB_FULL_NAME"

mkdir -p "$LOG_DIR"
mkdir -p "$LOCAL_TOOLS_DIR/bin"
export PATH="$LOCAL_TOOLS_DIR/bin:$PATH"
exec > "$LOG_FILE" 2>&1

fail() {
  echo "发布失败：$1"
  echo "日志：$LOG_FILE"
  /usr/bin/open "$LOG_FILE" >/dev/null 2>&1 || true
  exit 1
}

cd "$PROJECT_ROOT"
echo "静栖 GitHub 公有仓库发布与远端校验"
echo "项目：$PROJECT_ROOT"

[[ "$(git branch --show-current)" == "main" ]] || fail "当前分支不是 main。"
[[ -z "$(git status --porcelain)" ]] || fail "工作区存在未提交修改，请先完成本地提交。"

SUSPICIOUS_FILES="$(git ls-files | grep -E '(^|/)(\.env($|\.)|credentials?($|\.)|[^/]+\.(jks|keystore|pem|p12|pfx|key)$)' || true)"
[[ -z "$SUSPICIOUS_FILES" ]] || fail "发现不应公开的敏感文件：$SUSPICIOUS_FILES"

SECRET_HISTORY="$(git log --all -G 'gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----' --pretty=format:'%H %s' -- . || true)"
[[ -z "$SECRET_HISTORY" ]] || fail "Git 历史中发现疑似密钥，请人工复核后再公开：$SECRET_HISTORY"

TRACKED_BLOAT="$(git ls-files | grep -E '(^|/)(node_modules|\.gradle|\.local-android-sdk|\.local-jdk|build|dist)(/|$)' || true)"
[[ -z "$TRACKED_BLOAT" ]] || fail "发现不应提交的本地依赖或构建缓存：$TRACKED_BLOAT"

GIT_CREDENTIAL="$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null || true)"
GIT_PASSWORD="$(printf '%s\n' "$GIT_CREDENTIAL" | sed -n 's/^password=//p')"

if [[ -n "$GIT_PASSWORD" ]]; then
  AUTH_LOGIN="$(curl -fsS -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer $GIT_PASSWORD" https://api.github.com/user | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin)["login"])')"
  [[ "$AUTH_LOGIN" == "$GITHUB_OWNER" ]] || fail "当前 GitHub 账号是 $AUTH_LOGIN，预期账号是 $GITHUB_OWNER。"

  REPO_STATUS="$(curl -sS -o "$LOG_DIR/github-repo-check.json" -w '%{http_code}' -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer $GIT_PASSWORD" "https://api.github.com/repos/$GITHUB_FULL_NAME")"
  if [[ "$REPO_STATUS" == "200" ]]; then
    echo "仓库已存在，将更新原仓库：$GITHUB_URL"
  elif [[ "$REPO_STATUS" == "404" ]]; then
    echo "正在创建公有仓库：$GITHUB_URL"
    curl -fsS -X POST -H 'Accept: application/vnd.github+json' -H "Authorization: Bearer $GIT_PASSWORD" https://api.github.com/user/repos \
      -d '{"name":"quiet-tidy-house-pico","description":"Jingqi — a pressure-free PICO Spatial ASMR room","private":false,"has_issues":true,"has_projects":false,"has_wiki":false}' \
      > "$LOG_DIR/github-repo-create.json"
  else
    fail "读取 GitHub 仓库状态失败，HTTP $REPO_STATUS。"
  fi
else
  if ! command -v gh >/dev/null 2>&1; then
    echo "正在从 GitHub 官方发布页下载临时 GitHub CLI…"
    GH_TAG="$(curl -fsSL -H 'Accept: application/vnd.github+json' https://api.github.com/repos/cli/cli/releases/latest | /usr/bin/python3 -c 'import json,sys; print(json.load(sys.stdin)["tag_name"])')"
    GH_VERSION="${GH_TAG#v}"
    case "$(uname -m)" in
      arm64) GH_ARCH="arm64" ;;
      x86_64) GH_ARCH="amd64" ;;
      *) fail "不支持的 Mac 处理器架构：$(uname -m)" ;;
    esac
    GH_ARCHIVE="$LOG_DIR/gh_${GH_VERSION}_macOS_${GH_ARCH}.zip"
    GH_EXTRACT_DIR="$LOG_DIR/gh-${GH_VERSION}"
    curl -fL "https://github.com/cli/cli/releases/download/$GH_TAG/gh_${GH_VERSION}_macOS_${GH_ARCH}.zip" -o "$GH_ARCHIVE"
    mkdir -p "$GH_EXTRACT_DIR"
    unzip -q -o "$GH_ARCHIVE" -d "$GH_EXTRACT_DIR"
    GH_DOWNLOADED_BIN="$(find "$GH_EXTRACT_DIR" -type f -path '*/bin/gh' -print -quit)"
    [[ -n "$GH_DOWNLOADED_BIN" ]] || fail "下载包中未找到 gh 可执行文件。"
    cp "$GH_DOWNLOADED_BIN" "$LOCAL_TOOLS_DIR/bin/gh"
    chmod +x "$LOCAL_TOOLS_DIR/bin/gh"
  fi

  if ! gh auth status --hostname github.com >/dev/null 2>&1; then
    echo "需要在浏览器完成一次 GitHub 登录授权。授权完成后脚本会自动继续。"
    gh auth login --hostname github.com --git-protocol https --web
  fi

  AUTH_LOGIN="$(gh api user --jq .login)"
  [[ "$AUTH_LOGIN" == "$GITHUB_OWNER" ]] || fail "当前 GitHub 账号是 $AUTH_LOGIN，预期账号是 $GITHUB_OWNER。"
  if gh repo view "$GITHUB_FULL_NAME" >/dev/null 2>&1; then
    echo "仓库已存在，将更新原仓库：$GITHUB_URL"
  else
    echo "正在创建公有仓库：$GITHUB_URL"
    gh repo create "$GITHUB_FULL_NAME" --public --source "$PROJECT_ROOT" --remote origin
  fi
fi

EXPECTED_REMOTE="https://github.com/$GITHUB_FULL_NAME.git"
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$EXPECTED_REMOTE"
else
  git remote add origin "$EXPECTED_REMOTE"
fi

git -c http.version=HTTP/1.1 push --set-upstream origin main

LOCAL_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git ls-remote origin refs/heads/main | awk '{print $1}')"
[[ -n "$REMOTE_COMMIT" ]] || fail "无法读取远端 main Commit ID。"
[[ "$LOCAL_COMMIT" == "$REMOTE_COMMIT" ]] || fail "远端 main 与本地不一致：本地 $LOCAL_COMMIT，远端 $REMOTE_COMMIT。"

PUBLIC_PRIVATE_VALUE="$(curl -fsS -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$GITHUB_FULL_NAME" | /usr/bin/python3 -c 'import json,sys; print(str(json.load(sys.stdin)["private"]).lower())')"
[[ "$PUBLIC_PRIVATE_VALUE" == "false" ]] || fail "GitHub 未登录公开接口验证失败。"

echo ""
echo "发布成功"
echo "GitHub URL：$GITHUB_URL"
echo "远端 main Commit ID：$REMOTE_COMMIT"
echo "七位 Commit ID：${REMOTE_COMMIT:0:7}"
echo "仓库可见性：PUBLIC"
echo "未登录访问校验：通过"
echo "日志：$LOG_FILE"
/usr/bin/open "$LOG_FILE" >/dev/null 2>&1 || true
