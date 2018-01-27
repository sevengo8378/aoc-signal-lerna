# ansible scaffold project

## Prerequisites 
* ansible

## install ansible galaxy 
* `ansible-galaxy install -r ./requirements.txt`

## how to deploy

### test on vagrant vm at local machine
```
ansible-playbook site.yml -l test [--tags crons] -k
```


## Related project
