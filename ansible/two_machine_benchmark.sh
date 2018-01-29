#!/usr/bin/env bash

cn_device=$1
oversea_device=$2
room=$3
use_zx=$4
action=$5

cron_action=remove
[[ "$action" == "start" ]] && cron_action=add

duration=1800

# 国内机器消息接收
ansible-playbook benchmark.yml -l ${cn_device} --tags cron_recv_${cron_action} --extra-vars "room=${room} zx=false"

# 海外机器消息发送
ansible-playbook benchmark.yml -l ${oversea_device} --tags cron_send_${cron_action} --extra-vars "room=${room} zx=false"

# 海外机器消息接收
ansible-playbook benchmark.yml -l ${oversea_device} --tags cron_recv_${cron_action} --extra-vars "room=${room}_reverse zx=false"

# 国内机器消息发送
ansible-playbook benchmark.yml -l ${cn_device} --tags cron_send_${cron_action} --extra-vars "room=${room}_reverse zx=false"

# 国内机器测试断线率
ansible-playbook benchmark.yml -l ${cn_device} --tags cron_recv_single_${cron_action} --extra-vars "room=${room}_single duration=${duration} zx=false"

# 海外机器测试断线率
ansible-playbook benchmark.yml -l ${oversea_device} --tags cron_recv_single_${cron_action} --extra-vars "room=${room}_single duration=${duration} zx=false"

# 国内机器消息接收(专线模式)
[[ "$use_zx" == "true" ]] && ansible-playbook benchmark.yml -l ${cn_device} --tags cron_recv_${cron_action} --extra-vars "room=${room}_zx zx=false"

# 海外机器消息发送(专线模式)
[[ "$use_zx" == "true" ]] && ansible-playbook benchmark.yml -l ${oversea_device} --tags cron_send_${cron_action} --extra-vars "room=${room}_zx zx=true"

# 海外机器消息接收(专线模式)
[[ "$use_zx" == "true" ]] && ansible-playbook benchmark.yml -l ${oversea_device} --tags cron_recv_${cron_action} --extra-vars "room=${room}_zx_reverse zx=true"

# 国内机器消息发送(专线模式)
[[ "$use_zx" == "true" ]] && ansible-playbook benchmark.yml -l ${cn_device} --tags cron_send_${cron_action} --extra-vars "room=${room}_zx_reverse zx=false"

# 海外机器测试断线率(专线模式)
[[ "$use_zx" == "true" ]] && ansible-playbook benchmark.yml -l ${oversea_device} --tags cron_recv_single_${cron_action} --extra-vars "room=${room}_single duration=${duration} zx=true"
