nz-cli
======

command utilities for nafkhanzam projects

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/nz-cli.svg)](https://npmjs.org/package/nz-cli)
[![Downloads/week](https://img.shields.io/npm/dw/nz-cli.svg)](https://npmjs.org/package/nz-cli)
[![License](https://img.shields.io/npm/l/nz-cli.svg)](https://github.com/nafkhanzam/nz-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g nz-cli
$ nz COMMAND
running command...
$ nz (-v|--version|version)
nz-cli/0.0.1 linux-x64 node-v14.17.1
$ nz --help [COMMAND]
USAGE
  $ nz COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`nz hello [FILE]`](#nz-hello-file)
* [`nz help [COMMAND]`](#nz-help-command)

## `nz hello [FILE]`

describe the command here

```
USAGE
  $ nz hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ nz hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/nafkhanzam/nz-cli/blob/v0.0.1/src/commands/hello.ts)_

## `nz help [COMMAND]`

display help for nz

```
USAGE
  $ nz help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_
<!-- commandsstop -->
