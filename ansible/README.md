# ansible scaffold project

## Prerequisites 
* ansible

## install ansible galaxy 
* `ansible-galaxy install -r ./requirements.txt`

## how to deploy

### test on vagrant vm at local machine
```
ansible-playbook site.yml -l test [--tags crons] -k

# 测试发送方

# 测试接收方
ansible-playbook benchmark.yml -l aws-test --tags cron_recv_add --extra-vars "room=1 zx=true" 
ansible-playbook benchmark.yml -l aws-test --tags cron_recv_remove --extra-vars "room=1 zx=true" 

# 测试single模式下断线率
ansible-playbook benchmark.yml -l aws-test --tags cron_recv_single_add --extra-vars "room=3 duration=60"
ansible-playbook benchmark.yml -l aws-test --tags cron_recv_single_remove --extra-vars "room=3 duration=60"
```


## Related project
