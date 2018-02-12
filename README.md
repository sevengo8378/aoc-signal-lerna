Javascript signal library for alo7 online class room.

This is a monorepo project which have 3 subprojects. 

## Dependencies
* [lerna](https://github.com/lerna/lerna)

## Directory Description
* [packages/aoc-signal](./packages/aoc-signal/README.md) - 库项目
* [packages/aoc-signal-cli]() - nodejs cli tool to test aoc-signal library
* [packages/aoc-signal-examples](./packages/aoc-signal-examples/README.md) - a web app demo which use aoc-signal
* [ansible](./ansible/README.md) - use [ansible](https://www.ansible.com/) scripts to do auto benchmark

## Development
```shell
lerna bootstrap # install dependencies for all subprojects

lerna publish # publish library

```