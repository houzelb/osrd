#!/usr/bin/env python3

import json
import os
import sys
from typing import Dict, List, Optional


def get_ci_context() -> Dict[str, Optional[str]]:
    """Get relevant environment variables from CircleCI."""
    data = {
        'sha': os.environ.get('CIRCLE_SHA1'),
        'pr_number': os.environ.get('CIRCLE_PR_NUMBER'),
        'branch': os.environ.get('CIRCLE_BRANCH'),
        'tag': os.environ.get('CIRCLE_TAG')
    }
    print("CI context:", data, file=sys.stderr)
    return data

def parse_target(target: str) -> tuple[str, Optional[str]]:
    """Parse target name into base name and flavor."""
    if '-' in target:
        base, flavor = target.split('-', 1)
        return base, flavor
    return target, None

def generate_tag(base: str, version: str, flavor: Optional[str] = None) -> str:
    """Generate a single tag with optional flavor."""
    if flavor:
        return f"{base}:{version}-{flavor}"
    return f"{base}:{version}"

def generate_tags(target: str, ci_context: Dict[str, Optional[str]]) -> List[str]:
    """Generate Docker tags based on CI context."""
    base_name, flavor = parse_target(target)
    base_edge = f"ghcr.io/openrailassociation/osrd-edge/{base_name}"
    base_stable = f"ghcr.io/openrailassociation/osrd-stable/{base_name}"
    tags = []

    # Pull Request context
    if ci_context['pr_number']:
        tags.extend([
            generate_tag(base_edge, ci_context['sha'], flavor),
            generate_tag(base_edge, f"pr-{ci_context['pr_number']}", flavor)
        ])

    # Dev branch context
    elif ci_context['branch'] == 'dev':
        tags.extend([
            generate_tag(base_edge, ci_context['sha'], flavor),
            generate_tag(base_edge, "dev", flavor)
        ])

    # Tagged context
    elif ci_context['tag']:
        tags.append(generate_tag(base_stable, ci_context['tag'], flavor))

    else:
        print("Warning: Unknown CI context", file=sys.stderr)
        return []

    return tags


def process_bakefile(input_path: str) -> None:
    """Process the bakefile and update it with appropriate tags."""
    with open(input_path, 'r') as f:
        bakefile = json.load(f)

    ci_context = get_ci_context()
    if not ci_context['sha']:
        print("Error: CIRCLE_SHA1 environment variable is required", file=sys.stderr)
        sys.exit(1)

    for target_name, target_config in bakefile['target'].items():
        if target_config.get('output') and target_config['output'][0] == 'type=cacheonly':
            continue

        if not target_config.get('output'):
            target_config['output'] = []
        if 'type=registry' not in target_config['output']:
            target_config['output'].append('type=registry')

        # Generate and add tags
        target_config['tags'] = generate_tags(target_name, ci_context)

    with open(input_path, 'w') as f:
        json.dump(bakefile, f, indent=2)


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <bakefile.json>", file=sys.stderr)
        sys.exit(1)

    bakefile_path = sys.argv[1]
    if not os.path.exists(bakefile_path):
        print(f"Error: File not found: {bakefile_path}", file=sys.stderr)
        sys.exit(1)

    process_bakefile(bakefile_path)


if __name__ == '__main__':
    main()
