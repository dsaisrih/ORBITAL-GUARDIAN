@echo off
title Orbital Guardian
echo.
echo  ============================================
echo   ORBITAL GUARDIAN - Full Stack Launch
echo  ============================================
echo.
cd /d "%~dp0"

echo [1/2] Starting Backend (Firestore) on port 5000...
start "Orbital Guardian - Backend" cmd /k node backend-server.js

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend on port 3000...
start "Orbital Guardian - Frontend" cmd /k node -e "const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');const s=http.createServer((req,res)=>{let fp=path.join('.',url.parse(req.url).pathname==='/'?'orbital-guardian-sim.html':url.parse(req.url).pathname);fs.readFile(fp,(e,d)=>{if(e){res.writeHead(404);res.end('Not Found');return;}const ext=path.extname(fp);const ct={'html':'text/html','js':'text/javascript','css':'text/css','json':'application/json'}[ext.slice(1)]||'text/plain';res.writeHead(200,{'Content-Type':ct});res.end(d);});});s.listen(3000,()=>{console.log('');console.log(' Frontend ready at http://localhost:3000');console.log(' Open this URL in your browser to use the app');console.log('');});"

timeout /t 2 /nobreak >nul

echo.
echo  ============================================
echo   Both servers are running!
echo   Open: http://localhost:3000
echo   Login: admin / admin123
echo  ============================================
echo.

start http://localhost:3000

pause
