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
                    if record.isUnicode():
                        return record.string.decode('utf-16-be').encode('utf-8').decode('utf-8')
                    else:
                        return record.string.decode('latin-1')
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
    
    # Method 3: Try to construct a name from the family and subfamily
    try:
        family = None
        subfamily = None
        
        if 'name' in font:
            name_table = font['name']
            
            # Family name is nameID 1, subfamily is nameID 2
            for record in name_table.names:
                if record.nameID == 1 and not family:
                    try:
                        if record.isUnicode():
                            family = record.string.decode('utf-16-be').encode('utf-8').decode('utf-8')
                        else:
                            family = record.string.decode('latin-1')
                    except Exception:
                        pass
                        
                if record.nameID == 2 and not subfamily:
                    try:
                        if record.isUnicode():
                            subfamily = record.string.decode('utf-16-be').encode('utf-8').decode('utf-8')
                        else:
                            subfamily = record.string.decode('latin-1')
                    except Exception:
                        pass
            
            if family:
                # Create a PostScript-like name
                ps_name = family.replace(' ', '')
                if subfamily and subfamily.lower() not in ['regular', 'normal', 'standard']:
                    ps_name += '-' + subfamily.replace(' ', '')
                return ps_name
    except Exception:
        pass
    
    # If all else fails, try to get the filename without extension
    try:
        if hasattr(font, 'reader') and hasattr(font.reader, 'file') and hasattr(font.reader.file, 'name'):
            filename = os.path.basename(font.reader.file.name)
            return os.path.splitext(filename)[0].replace(' ', '')
    except Exception:
        pass
    
    return None
