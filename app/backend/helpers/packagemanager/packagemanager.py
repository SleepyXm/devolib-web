PM_COMMANDS = {
        'npm':   lambda pkgs, dev: ['npm', 'install', '--save-dev' if dev else '--save'] + pkgs,
        'pip':   lambda pkgs, _:   ['pip', 'install'] + pkgs,
        'yarn':  lambda pkgs, dev: ['yarn', 'add', '--dev' if dev else None] + pkgs if not dev else ['yarn', 'add', '--dev'] + pkgs,
        'cargo': lambda pkgs, dev: ['cargo', 'add'] + (['--dev'] if dev else []) + pkgs,
    }