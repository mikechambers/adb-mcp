# MIT License
#
# Copyright (c) 2025 Mike Chambers
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import os
import sys
import glob
from fontTools.ttLib import TTFont

def list_all_fonts_postscript():
    """
    Returns a list of PostScript names for all fonts installed on the system.
    Works on both Windows and macOS.
    
    Returns:
        list: A list of PostScript font names as strings
    """
    postscript_names = []
    
    # Get font directories based on platform
    font_dirs = []
    
    if sys.platform == 'win32':  # Windows
        # Windows font directory
        if 'WINDIR' in os.environ:
            font_dirs.append(os.path.join(os.environ['WINDIR'], 'Fonts'))
    
    elif sys.platform == 'darwin':  # macOS
        # macOS system font directories
        font_dirs.extend([
            '/System/Library/Fonts',
            '/Library/Fonts',
            os.path.expanduser('~/Library/Fonts')
        ])
    
    else:
        print(f"Unsupported platform: {sys.platform}")
        return []
    
    # Get all font files from all directories
    font_extensions = ['*.ttf', '*.ttc', '*.otf']
    font_files = []
    
    for font_dir in font_dirs:
        if os.path.exists(font_dir):
            for ext in font_extensions:
                font_files.extend(glob.glob(os.path.join(font_dir, ext)))
                # Also check subdirectories on macOS
                if sys.platform == 'darwin':
                    font_files.extend(glob.glob(os.path.join(font_dir, '**', ext), recursive=True))
    
    # Process each font file
    for font_path in font_files:
        try:
            # TrueType Collections (.ttc files) can contain multiple fonts
            if font_path.lower().endswith('.ttc'):
                try:
                    ttc = TTFont(font_path, fontNumber=0)
                    num_fonts = ttc.reader.numFonts
                    ttc.close()
                    
                    # Extract PostScript name from each font in the collection
                    for i in range(num_fonts):
                        try:
                            font = TTFont(font_path, fontNumber=i)
                            ps_name = _extract_postscript_name(font)
                            if ps_name and not ps_name.startswith('.'):
                                postscript_names.append(ps_name)
                            font.close()
                        except Exception as e:
                            print(f"Error processing font {i} in collection {font_path}: {e}")
                except Exception as e:
                    print(f"Error determining number of fonts in collection {font_path}: {e}")
            else:
                # Regular TTF/OTF file
                try:
                    font = TTFont(font_path)
                    ps_name = _extract_postscript_name(font)
                    if ps_name:
                        postscript_names.append(ps_name)
                    font.close()
                except Exception as e:
                    print(f"Error processing font {font_path}: {e}")
        except Exception as e:
            print(f"Error with font file {font_path}: {e}")
 
    return list(set(postscript_names))

def _extract_postscript_name(font):
    """
    Extract the PostScript name from a TTFont object.
    
    Args:
        font: A TTFont object
        
    Returns:
        str: The PostScript name or None if not found
    """
    # Method 1: Try to get it from the name table (most reliable)
    if 'name' in font:
        name_table = font['name']
        
        # PostScript name is stored with nameID 6
        for record in name_table.names:
            if record.nameID == 6:
                # Try to decode the name
                try:
                    return (
                        record.string.decode('utf-16-be').encode('utf-8').decode('utf-8')
                        if record.isUnicode() else record.string.decode('latin-1')
                    )
                except Exception:
                    pass
    
    # Method 2: For CFF OpenType fonts
    if 'CFF ' in font:
        try:
            cff = font['CFF ']
            if cff.cff.fontNames:
                return cff.cff.fontNames[0]
        except Exception:
            pass
    
    return None

if __name__ == "__main__":
    font_names = list_all_fonts_postscript()
    print(f"Number of fonts found: {len(font_names)}")