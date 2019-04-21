#!/bin/bash

source ./venv/bin/activate

export FLASK_APP="src/app.py"
export FLASK_ENV="development"

trap_string="trap '"
proc_string=""
start_port=5000
neighbor_count=1

cd src;

if [ $1 = "a" ]; then
    trap_string="trap ' kill %1; kill %2; kill %3; kill %4; kill %5; kill %6; kill %7;' SIGINT"
    proc_string="python3 app.py -p 5000 --servers 5003 &
python3 app.py -p 5001 --servers 5003 &
python3 app.py -p 5002 --servers 5004 &
python3 app.py -p 5003 --servers 5005 &
python3 app.py -p 5004 --servers 5007 &
python3 app.py -p 5005 --servers 5003 &
python3 app.py -p 5006 --servers 5003 --mine &
python3 app.py -p 5007 --servers 5000"
elif [ $1 = "b" ]; then
    trap_string="trap ' kill %1; kill %2;' SIGINT"
    proc_string="python3 app.py -p 5000 --servers 5001 --mine &
python3 app.py -p 5001 --servers 5002 &
python3 app.py -p 5002 --servers 5001"
else
    for i in $(seq 1 $(($1 - 1))); do
        trap_string="$trap_string kill %$i;"
    done

    for i in $(seq 1 $1); do
        port=$(($start_port + $i - 1))
        other_ports=""
        for j in $(seq 1 $neighbor_count); do
            other_port=$(shuf -i 0-$(($1 - 1)) -n 1)
            other_port_full=$(($start_port + $other_port))
            while [[ $other_port_full == $port || $other_ports =~ "$other_port_full"  ]]; do
                other_port=$(shuf -i 0-$(($1 - 1)) -n 1)        
                other_port_full=$(($start_port + $other_port))
            done
            other_ports="$other_ports $other_port_full"
        done
        this_proc_string="python3 app.py -p $port --servers $other_ports"
        proc_string="$proc_string & $this_proc_string"
        echo $this_proc_string
    done
    trap_string="$trap_string' SIGINT"
    proc_string="${proc_string:2}"
fi

eval $trap_string && eval $proc_string