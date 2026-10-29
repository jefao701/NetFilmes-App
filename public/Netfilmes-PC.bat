@echo off
title Netfilmes PC
echo ======================================================
echo           NETFILMES - VERSAO PARA COMPUTADOR
echo ======================================================
echo Abrindo aplicativo em modo desktop nativo...

:: Tenta executar via Microsoft Edge no modo App (sem abas, janela limpa como um .exe nativo)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="https://netflimespp.vercel.app" --start-maximized
    exit
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="https://netflimespp.vercel.app" --start-maximized
    exit
)

:: Tenta executar via Google Chrome no modo App
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="https://netflimespp.vercel.app" --start-maximized
    exit
)

if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="https://netflimespp.vercel.app" --start-maximized
    exit
)

:: Caso contrario, abre no navegador padrao
start https://netflimespp.vercel.app
exit
