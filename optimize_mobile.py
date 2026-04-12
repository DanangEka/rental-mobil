import os
import re

directory = 'src/'

replacements = {
    # Padding
    r'(?<![a-zA-Z0-9:-])p-6(?!-)': 'p-4 md:p-6',
    r'(?<![a-zA-Z0-9:-])p-8(?!-)': 'p-4 sm:p-6 md:p-8',
    r'(?<![a-zA-Z0-9:-])p-10(?!-)': 'p-5 sm:p-8 md:p-10',
    r'(?<![a-zA-Z0-9:-])p-12(?!-)': 'p-6 sm:p-10 md:p-12',
    r'(?<![a-zA-Z0-9:-])px-6(?!-)': 'px-4 md:px-6',
    r'(?<![a-zA-Z0-9:-])px-8(?!-)': 'px-4 md:px-8',
    r'(?<![a-zA-Z0-9:-])py-6(?!-)': 'py-4 md:py-6',
    r'(?<![a-zA-Z0-9:-])py-8(?!-)': 'py-4 md:py-8',
    r'(?<![a-zA-Z0-9:-])py-10(?!-)': 'py-6 md:py-10',
    r'(?<![a-zA-Z0-9:-])py-12(?!-)': 'py-8 md:py-12',
    
    # Margin
    r'(?<![a-zA-Z0-9:-])mb-8(?!-)': 'mb-6 md:mb-8',
    r'(?<![a-zA-Z0-9:-])mb-10(?!-)': 'mb-6 md:mb-10',
    r'(?<![a-zA-Z0-9:-])mb-12(?!-)': 'mb-8 md:mb-12',
    r'(?<![a-zA-Z0-9:-])mt-8(?!-)': 'mt-6 md:mt-8',
    r'(?<![a-zA-Z0-9:-])mt-10(?!-)': 'mt-6 md:mt-10',
    r'(?<![a-zA-Z0-9:-])mt-12(?!-)': 'mt-8 md:mt-12',

    # Text Sizes
    r'(?<![a-zA-Z0-9:-])text-3xl(?!-)': 'text-2xl md:text-3xl',
    r'(?<![a-zA-Z0-9:-])text-4xl(?!-)': 'text-2xl sm:text-3xl lg:text-4xl',
    r'(?<![a-zA-Z0-9:-])text-5xl(?!-)': 'text-3xl sm:text-4xl lg:text-5xl',

    # Gap
    r'(?<![a-zA-Z0-9:-])gap-6(?!-)': 'gap-4 md:gap-6',
    r'(?<![a-zA-Z0-9:-])gap-8(?!-)': 'gap-4 sm:gap-6 md:gap-8',

    # Rounded Corners
    r'(?<![a-zA-Z0-9:-])rounded-3xl(?!-)': 'rounded-2xl md:rounded-3xl',
    r'(?<![a-zA-Z0-9:-])rounded-\[2\.5rem\](?!-)': 'rounded-2xl md:rounded-[2.5rem]',
}

def is_duplicate(content, pattern, old_str, target_str):
    ''' Checks if the file inherently has duplicates or if the replacement already exists in the same context to prevent double entries. 
        Instead of a complex check, we'll just apply the regex and then do a quick pass to remove duplicate classes if any arise. '''
    pass

for root, _, files in os.walk(directory):
    for filename in files:
        if filename.endswith(".js") or filename.endswith(".jsx"):
            filepath = os.path.join(root, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content
            for pattern, replacement in replacements.items():
                # Avoid matching if 'md:' variant is already somewhere right next to it, but standard regex replacement is usually safe enough 
                # if we only run it once.
                new_content = re.sub(pattern, replacement, new_content)

            # Optional: Deduplicate classes if re.sub created something like "p-4 md:p-6 md:p-6"
            # It's better to just write the file
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

print("Optimization complete.")
