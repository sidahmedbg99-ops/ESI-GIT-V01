1/ 
Clone the repo
2/ 
cd ESI_GIT_backend
3/ create a virtual environment
python -m venv venv
4/ activate it
venv\Scripts\activate
5/ install all whats needed
pip install -r requirements.txt
6/ manually create .env file
use .env.example as a template and fill it 
7/
python manage.py migrate
8/ test if its working
python manage.py runserver


if the venv dosent work in vs code integrated terminal , use this command
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
this fixes it only for the current session