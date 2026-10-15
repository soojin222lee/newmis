#!/usr/bin/env bash
# 튜토리얼 4종 전체 재생성 → dist/ + public/tutorials/
set -e
cd "$(dirname "$0")"
node build-tutorial.js tutorial-config-si.js      "AiBudget-튜토리얼-수주형등록.html"   "AiBudget 업무 튜토리얼 · 수주형 등록"         tutorial-si.html
node build-tutorial.js tutorial-config-wg.js      "AiBudget-튜토리얼-WG사내개설.html"   "AiBudget 업무 튜토리얼 · WG·사내 개설"        tutorial-wg.html
node build-tutorial.js tutorial-config-version.js "AiBudget-튜토리얼-실행예산버전.html" "AiBudget 업무 튜토리얼 · 실행예산 버전 관리"   tutorial-version.html
node build-tutorial.js tutorial-config-close.js   "AiBudget-튜토리얼-프로젝트종료.html" "AiBudget 업무 튜토리얼 · 프로젝트 종료"       tutorial-close.html
echo "✅ 튜토리얼 4종 재생성 완료 → public/tutorials/"
