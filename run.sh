#!/bin/sh

session="stud"

tmux kill-server

# set up tmux
tmux start-server

# create a new tmux session
tmux new-session -d -s $session

# create pane 1
tmux select-pane -t 1
tmux send-keys "cd server;./run.sh b" Enter

# split pane 1 horizontally
tmux split-window -h -p 50

# create pane 2
tmux select-pane -t 2
tmux send-keys "cd client;npm start" Enter

# attach to the tmux session
tmux attach-session -t $session

tmux kill-session -t $session