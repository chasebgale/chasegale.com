<?php
    /* I'm writing PHP!?!? WHAT YEAR IS IT?!?! */
    header('Content-Type: text/html');
    header('Access-Control-Allow-Origin: *'); 
    header('Access-Control-Allow-Headers: *');
    
    $string = file_get_contents("https://github.com/users/chasebgale/contributions");
    echo $string;
?>