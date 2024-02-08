import os, shutil

# add_page_title feeds off the filename and adds that name to a title tag in the html.
# Added feature to remove the 'demo_capture = ' from the top of the HTML JSON-capture files.
# This is used by pretty_html.py

def add_canonical( output_file, file_name):
    web_path_base = "https://triquence.org/"
    canonical_element = "  <link rel='canonical' href='" + web_path_base + file_name + "' />\n"
    output_file.write( canonical_element)

def add_page_title( directory_path, file_name):
    # Open the file
    full_path_input = directory_path + "\\" + file_name
    if os.path.isfile( full_path_input):
        input_file = open( full_path_input, 'r')
    else:
        return
        
    # Open a temporary output file.
    file_name_temp = 'AAA_temp_for_title.html'
    full_path_output = directory_path + "\\" + file_name_temp
    temp_output_file = open( full_path_output, 'w')
    
    for single_line in input_file:
        if "<head>" in single_line:
            temp_output_file.write( single_line)
            add_canonical( temp_output_file, file_name)
            
        elif "<title></title>" in single_line:
            # Insert the filename into the html title.
            single_line_corrected = single_line.replace('<title>', '<title>' + file_name.replace('.html',''))
            temp_output_file.write( single_line_corrected)
            
        elif "<title>Exported from Notepad++</title>" in single_line:
            single_line_corrected = single_line.replace('<title>Exported from Notepad++</title>', '<title>' + file_name.replace('.html','') + '</title>')
            temp_output_file.write( single_line_corrected)
            
        elif "demo_capture</span>" in single_line:
            # Remove 'demo_capture = ' from this line.
            single_line_corrected = single_line.replace('demo_capture</span> <span class="o">=</span> ', '')
            temp_output_file.write( single_line_corrected)
        
        else:
            temp_output_file.write( single_line)
    
    
    # Close and delete the original input file.
    input_file.close()
    os.remove( full_path_input)

    # Rename the temp.
    temp_output_file.close()
    os.rename( full_path_output, full_path_input)

if __name__ == "__main__":
    # Example of how this could be used directly. Edit the following, then run this file from
    # the command line.
    add_page_title('A15a_2D_finished_game.html')