<?php

// позволените rest api методи 

enum RequestMethod: string
{
    case GET = 'GET';
    case POST = 'POST';
    case PUT = 'PUT'; 
    case DELETE = 'DELETE';
}
