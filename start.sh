#!/bin/bash


(npm run dev) &

(cd app/backend && python3 -m uvicorn main:app --reload) &

wait