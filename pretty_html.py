#!/usr/bin/env python3

# Publish Pygame physics-engine content.
# This script produces color HTML files and text files from python source-code files. It also takes care
# of publishing these files and PDF files to the web-site directory. It issues a warning if the PDFs
# are older than the corresponding Word files.

import sys, os, os.path, shutil
# This module should be in the same folder.
import pretty_title

# Here is what this looks like running from the command line.
# pygmentize -f html -O full,style=fruity -l python -o a01_ball_cursor.html a01_ball_cursor.py

def filecopy_doesnotexist_or_isold( path_to_source, path_to_copy):
    # Check "modify" timestamp to see if the copy file doesn't exist or is older than the source file.
    need_new_copy = False
    copy_isold = False
    copy_exists = os.path.isfile( path_to_copy)
    if copy_exists:
        copy_isold = os.path.getmtime( path_to_copy) < os.path.getmtime( path_to_source) 
    need_new_copy = (not copy_exists) or copy_isold or doAll
    return need_new_copy
            
def publish_code_from_here( source_path, target_path):
    print("Source path:", source_path)
    source_files = os.listdir(source_path)
    for eachname in source_files:
        path_to_source_file = source_path + "\\" + eachname
        if os.path.isfile( path_to_source_file):
            file_name_parts = os.path.splitext(eachname)
            file_name = file_name_parts[0] # the file name
            file_ext = file_name_parts[1]  # the file extension
            
            if ((file_ext == '.js') or (file_ext == '.json')) and not (eachname in exclude_list):
                
                file_html_name = file_name + ".html"
                
                path_to_html_output_file = target_path + "\\" + file_name + file_ext + ".html"
                
                # Make an HTML file copy in the source directory.
                if filecopy_doesnotexist_or_isold( path_to_source_file, path_to_html_output_file):
                    # styles I like: fruity, default, perldoc, tango, manni, emacs, monokai ;  linenos=inline (or table, or True)
                    # Note: I had to modify the monokai stuff to get the line numbers to have a good contrasting background.
                    #command_line_string = "pygmentize -f html -O full,style=monokai,linenos=True -l python -o " + file_html_name + " " + eachname
                    
                    # Must put the paths in quotes because of spaces in folder names.
                    if file_ext == '.py':
                        language = "python"
                    elif file_ext == '.sh':
                        language = "bash"
                    elif file_ext == '.js':
                        language = "javascript"
                    elif file_ext == '.json':
                        language = "javascript"
                    else:
                        language = "python"
                    
                    # The first block is a method to make a simple html conversion for large code files.
                    # Chrome currently has trouble rendering large color-formatted code files so this produces a simpler
                    # output in that large-file case.
                    
                    source_file_size = os.path.getsize( path_to_source_file)
                    print("input filesize = ", source_file_size)
                        
                    # Produce a colorized syntax formatted html file
                    command_line_string = 'pygmentize -f html -O full,style=default -l '+ language +' -o "' + path_to_html_output_file + '" "' + path_to_source_file + '"'
                    #command_line_string = 'pygments3 -f html -O full,style=default -l '+ language +' -o "' + path_to_html_output_file + '" "' + path_to_source_file + '"'
                        
                    # Run the command (and delete the temporary escaped file, if needed).
                    os.system( command_line_string)
                    if os.path.isfile("temp_escaped.txt"): os.remove("temp_escaped.txt")
                    
                    # Look for empty title element and insert the filename.
                    pretty_title.add_page_title( target_path, file_name + file_ext + ".html")
                    print("HTML file created: ", file_name + file_ext + ".html")
                
                
#--------------------------------------
#-----------Main program---------------
#--------------------------------------

doAll = False
if (len(sys.argv) > 1):
    if (sys.argv[1] == "all"): doAll = True

# Paths on NUC            
# Publish the code files from these two folders...
exclude_list = ['adapter-latest.js', 'gwModule-withBug.js', 'index3.js', 'jquery-3.1.1.min.js', 'math.min.js', 'scratch_notes.js', 'w3data.js']
publish_code_from_here("C:\\Users\\Jim\\Documents\\webcontent\\root-50webs", "C:\\Users\\Jim\\Documents\\webcontent\\root-50webs")

exclude_list = ['']
publish_code_from_here("C:\\Users\\Jim\\Documents\\webcontent\\node\\heroku-pet", "C:\\Users\\Jim\\Documents\\webcontent\\root-50webs")
