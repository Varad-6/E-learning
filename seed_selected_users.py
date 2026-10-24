"""
Kaizen LMS - Complete Enterprise User Seeder Script
Contains all 105 company employees from Kaizen_Employee_Seed_Data_Updated (1).xlsx
Explicitly excludes: Umesh Shinde (AIS001 / umesh@abhiyantatech.com)
Self-contained: no external file or openpyxl dependency.
"""

import sys
import os
import uuid
from typing import List, Dict, Optional

# Reconfigure stdout for UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.department import Department
from app.core.security import get_password_hash

# Fixed Role UUIDs
ROLE_MAP = {
    "SYSTEM_ADMIN": uuid.UUID("a0a0a0a0-0000-0000-0000-000000000001"),
    "COURSE_MANAGER": uuid.UUID("a0a0a0a0-0000-0000-0000-000000000002"),
    "EMPLOYEE": uuid.UUID("a0a0a0a0-0000-0000-0000-000000000003"),
    "HR_ADMIN": uuid.UUID("a0a0a0a0-0000-0000-0000-000000000004"),
}

STANDARD_DEPTS = [{'code': 'AI', 'name': 'Artificial Intelligence', 'desc': 'AI & Machine Learning Engineering'}, {'code': 'MM', 'name': 'SAP MM', 'desc': 'SAP Materials Management'}, {'code': 'FICO', 'name': 'SAP FICO', 'desc': 'SAP Financial Accounting & Controlling'}, {'code': 'SAC', 'name': 'SAP SAC', 'desc': 'SAP Analytics Cloud'}, {'code': 'ABAP', 'name': 'SAP ABAP', 'desc': 'SAP ABAP Development'}, {'code': 'BASIS', 'name': 'SAP Basis', 'desc': 'SAP Basis Administration'}, {'code': 'PP', 'name': 'SAP PP', 'desc': 'SAP Production Planning'}, {'code': 'SD', 'name': 'SAP SD', 'desc': 'SAP Sales & Distribution'}, {'code': 'HR', 'name': 'Human Resources', 'desc': 'HR & People Operations'}, {'code': 'IT', 'name': 'Information Technology', 'desc': 'Internal IT & Infrastructure'}, {'code': 'ACCOUNTS', 'name': 'Accounts & Finance', 'desc': 'Corporate Accounts & Finance'}, {'code': 'ADMINISTRATION', 'name': 'Administration', 'desc': 'Facility & General Administration'}, {'code': 'DELIVERY', 'name': 'Delivery Management', 'desc': 'Project Delivery & PMO'}, {'code': 'DESIGN', 'name': 'Design & Media', 'desc': 'UI/UX & Graphic Design'}, {'code': 'SALES', 'name': 'Corporate Sales', 'desc': 'Business Development & Sales'}, {'code': 'TRM', 'name': 'Treasury & Risk', 'desc': 'Treasury & Risk Management'}]

ALL_USERS = [{'first_name': 'Ali', 'last_name': 'Faiz', 'employee_code': 'INT055', 'email': 'ali.f@abhiyantatech.com', 'dept_code': None, 'role_name': 'HR_ADMIN'}, {'first_name': 'Yash', 'last_name': 'Kolte', 'employee_code': 'INT069', 'email': 'yash.k@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Ritesh', 'last_name': 'Patil', 'employee_code': 'INT054', 'email': 'ritesh.p@abhiyantatech.com', 'dept_code': 'AI', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Samiksha', 'last_name': 'Jagtap', 'employee_code': 'INT052', 'email': 'samiksha.j@abhiyantatech.com', 'dept_code': None, 'role_name': 'SYSTEM_ADMIN'}, {'first_name': 'Akanksha', 'last_name': 'Kumbhar', 'employee_code': 'AIS226', 'email': 'akanksha.k@abhiyantatech.com', 'dept_code': None, 'role_name': 'SYSTEM_ADMIN'}, {'first_name': 'Sayali', 'last_name': 'Shirbhate', 'employee_code': 'AIS246', 'email': 'sayali.s@abhiyantatech.com', 'dept_code': None, 'role_name': 'HR_ADMIN'}, {'first_name': 'Akshata', 'last_name': 'Kshirsagar', 'employee_code': 'AIS242', 'email': 'akshata.k@abhiyantatech.com', 'dept_code': None, 'role_name': 'HR_ADMIN'}, {'first_name': 'Faisal', 'last_name': 'Khan', 'employee_code': 'AIS201', 'email': 'faisal.k@abhiyantatech.com', 'dept_code': None, 'role_name': 'SYSTEM_ADMIN'}, {'first_name': 'System', 'last_name': 'Admin', 'employee_code': 'AIS000', 'email': 'systemadmin@abhiyantatech.com', 'dept_code': None, 'role_name': 'SYSTEM_ADMIN'}, {'first_name': 'Varad', 'last_name': 'Kadam', 'employee_code': 'INT049', 'email': 'varad.k@abhiyantatech.com', 'dept_code': None, 'role_name': 'SYSTEM_ADMIN'}, {'first_name': 'Aniket', 'last_name': 'Patro', 'employee_code': 'AIS255', 'email': 'aniket.p@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Prithviraj', 'last_name': 'Taware', 'employee_code': 'INT080', 'email': 'prithviraj.t@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Pallavi', 'last_name': 'Daruka', 'employee_code': 'INT070', 'email': 'pallavi.d@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Tejas', 'last_name': 'Charhate', 'employee_code': 'INT073', 'email': 'tejas.c@abhiyantatech.com', 'dept_code': 'SAC', 'role_name': 'EMPLOYEE'}, {'first_name': 'Lokesh', 'last_name': 'Jadhao', 'employee_code': 'AIS244', 'email': 'lokesh.ja@abhiyantatech.com', 'dept_code': 'SAC', 'role_name': 'EMPLOYEE'}, {'first_name': 'Shantanu', 'last_name': 'Yadav', 'employee_code': 'INT060', 'email': 'shantanu.y@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Shyamli', 'last_name': 'Sharma', 'employee_code': 'INT062', 'email': 'shyamli.s@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Nitesh', 'last_name': 'Astik Tingre', 'employee_code': 'AIS163', 'email': 'Nitesh.T@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Niklesh', 'last_name': 'Rajendra Johare', 'employee_code': 'AIS188', 'email': 'Niklesh.J@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Anand', 'last_name': 'Dilip Patil', 'employee_code': 'AIS199', 'email': 'Anand@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Sagar', 'last_name': 'Jalindar Gaikwad', 'employee_code': 'AIS209', 'email': 'Sagar.G@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Om', 'last_name': 'Rajendra Ingule', 'employee_code': 'AIS216', 'email': 'Om.I@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Harshal', 'last_name': 'Sunil Dongare', 'employee_code': 'AIS217', 'email': 'harshal.D@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Pratik', 'last_name': 'Prashant Mahajan', 'employee_code': 'AIST123', 'email': 'Pratik.M@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Ashwini', 'last_name': 'Pranjal Gore', 'employee_code': 'AIST140', 'email': 'Ashwini.G@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Swapnil', 'last_name': 'Suresh Darji', 'employee_code': 'AIST141', 'email': 'Swapnil.D@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Sanket', 'last_name': 'Sunil Kharade', 'employee_code': 'AIS179', 'email': 'sanket@abhiyantatech.com', 'dept_code': 'BASIS', 'role_name': 'EMPLOYEE'}, {'first_name': 'Baliram', 'last_name': 'Umakant Amalpure', 'employee_code': 'AIS183', 'email': 'baliram@abhiyantatech.com', 'dept_code': 'BASIS', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Shubham', 'last_name': 'Dhanyakumar Pujari', 'employee_code': 'AIS215', 'email': 'Shubham.P@abhiyantatech.com', 'dept_code': 'BASIS', 'role_name': 'EMPLOYEE'}, {'first_name': 'Pratik', 'last_name': 'Sudhir Brahmankar', 'employee_code': 'AIST128', 'email': 'Pratik.B@abhiyantatech.com', 'dept_code': 'BASIS', 'role_name': 'EMPLOYEE'}, {'first_name': 'Narendra', 'last_name': 'Sudhir Pandit', 'employee_code': 'AIS196', 'email': 'Narendra.P@abhiyantatech.com', 'dept_code': 'PP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Chirag', 'last_name': 'Bhupesh Raut', 'employee_code': 'AIS220', 'email': 'Chirag.r@abhiyantatech.com', 'dept_code': 'PP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Rohit', 'last_name': 'Bhojraj Nagdeve', 'employee_code': 'AIS236', 'email': 'Rohit.N@abhiyantatech.com', 'dept_code': 'PP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Rupali', 'last_name': 'Murtaji Londhe', 'employee_code': 'AIS251', 'email': 'Rupali.L@abhiyantatech.com', 'dept_code': 'PP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Puri', 'last_name': 'Ajay Janakrao', 'employee_code': 'AIST121', 'email': 'ajayp@abhiyantatech.com', 'dept_code': 'PP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Songire', 'last_name': 'Harshal Sharad', 'employee_code': 'AIST129', 'email': 'Harshal.S@abhiyantatech.com', 'dept_code': 'PP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Swapnil', 'last_name': 'Ashok Mahajan', 'employee_code': 'AIS174', 'email': 'Swapnil.M@abhiyantatech.com', 'dept_code': 'DELIVERY', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Karan', 'last_name': 'Vishwanath Kedari', 'employee_code': 'AIS218', 'email': 'karan.k@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Parth', 'last_name': 'Naresh Chafekar', 'employee_code': 'AIS219', 'email': 'Parth.c@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Priyadarshani', 'last_name': 'Rajan Dixit', 'employee_code': 'AIS237', 'email': 'Priyadarshani.M@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Dipali', 'last_name': 'Rajendra Aursange', 'employee_code': 'AIS244', 'email': 'Dipali.A@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Amol', 'last_name': 'Anil Ghodake', 'employee_code': 'AIS258', 'email': 'Amol.G@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Pooja', 'last_name': 'Pravin Virkhare', 'employee_code': 'AIS248', 'email': 'Pooja.v@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Trupti', 'last_name': 'Ajay Wakhare', 'employee_code': 'AIST147', 'email': 'Trupti.W@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Varsha', 'last_name': 'Rajesh Rane', 'employee_code': 'AIS097', 'email': 'Varsha@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Swapnil', 'last_name': 'Bhaskar Firake', 'employee_code': 'AIS050', 'email': 'swapnil@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Ganesh', 'last_name': 'Shetty', 'employee_code': 'AIS175', 'email': 'Ganesh.S@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Amol', 'last_name': 'Uttamrao Somwanshi', 'employee_code': 'AIS181', 'email': 'Amol.S@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Krunal', 'last_name': 'Yadavrao Khode', 'employee_code': 'AIS194', 'email': 'Krunal.K@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Sumit', 'last_name': 'Sitaram Khamkar', 'employee_code': 'AIS203', 'email': 'Sumit.G@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Omkar', 'last_name': 'Suresh Puranik', 'employee_code': 'AIS204', 'email': 'Omkar.P@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Harke', 'last_name': 'Gaurav Gurusiddhappa', 'employee_code': 'AIS192', 'email': 'Gaurav.H@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Hrushikesh', 'last_name': 'Vasant Adling', 'employee_code': 'AIS238', 'email': 'Hrushikesh.A@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Shubham', 'last_name': 'Bharat Jagdale', 'employee_code': 'AIS239', 'email': 'Shubham.j@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Pratik', 'last_name': 'Pandurang Patil', 'employee_code': 'AIS241', 'email': 'Pratik.P@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Vidya', 'last_name': 'Raju Sagare', 'employee_code': 'AIS247', 'email': 'Vidya.S@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Shital', 'last_name': 'Anirudha Reddy', 'employee_code': 'AIST092', 'email': 'shitalr@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Anuj', 'last_name': 'Kundlik Ramteke', 'employee_code': 'AIST130', 'email': 'Anuj.R@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Darshan', 'last_name': 'Dinesh Sonawane', 'employee_code': 'AIST139', 'email': 'Darshan.S@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Aman', 'last_name': 'Kumar Dikshit', 'employee_code': 'AIS254', 'email': 'Aman.D@abhiyantatech.com', 'dept_code': 'TRM', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Vinod', 'last_name': 'Harkare', 'employee_code': 'AIS171', 'email': 'Vinod.H@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Praveen', 'last_name': 'Ramashree Rajbhar', 'employee_code': 'AIS213', 'email': 'Praveen.R@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Nikhil', 'last_name': 'Pralhad Kolhe', 'employee_code': 'AIS214', 'email': 'Nikhil.k@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Tushar', 'last_name': 'Salikram Jadhav', 'employee_code': 'AIS231', 'email': 'Tushar.j@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Shriram', 'last_name': 'Satish Mahashikare', 'employee_code': 'AIS240', 'email': 'Shriram.M@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Swapnil', 'last_name': 'Shriram Kumbhar', 'employee_code': 'AIS250', 'email': 'Swapnil.k@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Shubham', 'last_name': 'Sudhakar Darade', 'employee_code': 'AIS257', 'email': 'Shubham.D@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Rahul', 'last_name': 'Shantappa Salgare', 'employee_code': 'AIS243', 'email': 'Rahul.S@abhiyantatech.com', 'dept_code': 'AI', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Shrikant', 'last_name': 'Ramchandra Tadwalkar', 'employee_code': 'AIS229', 'email': 'Shrikant.T@abhiyantatech.com', 'dept_code': 'SAC', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Prashant', 'last_name': 'Umakant Amalpure', 'employee_code': 'AIS222', 'email': 'Prashant.a@abhiyantatech.com', 'dept_code': 'IT', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Tushar', 'last_name': 'Sampat Kudale', 'employee_code': 'AIS140', 'email': 'Designer@abhiyantatech.com', 'dept_code': 'DESIGN', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Shivani', 'last_name': 'Ramesh Bhalerao', 'employee_code': 'AIS210', 'email': 'Shivani@abhiyantatech.com', 'dept_code': 'SALES', 'role_name': 'EMPLOYEE'}, {'first_name': 'Zaid', 'last_name': 'Nazir Shaikh', 'employee_code': 'AIS211', 'email': 'Zaid.s@abhiyantatech.com', 'dept_code': 'SALES', 'role_name': 'EMPLOYEE'}, {'first_name': 'Biswaranjan', 'last_name': 'Mishra', 'employee_code': 'AIS256', 'email': 'Biswaranjan.M@abhiyantatech.com', 'dept_code': 'SALES', 'role_name': 'EMPLOYEE'}, {'first_name': 'Kavita', 'last_name': 'Lalitkumar Deore', 'employee_code': 'AIS260', 'email': 'Kavita.D@abhiyantatech.com', 'dept_code': 'SALES', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Rushikesh', 'last_name': 'Shankar Bokshe', 'employee_code': 'AIS259', 'email': 'Rushikesh.B@abhiyantatech.com', 'dept_code': 'SALES', 'role_name': 'EMPLOYEE'}, {'first_name': 'Ketan', 'last_name': 'Anil Khapre', 'employee_code': 'AIS245', 'email': 'KetanK@abhiyantatech.com', 'dept_code': 'SALES', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Shubhangi', 'last_name': 'Rajendra Joshi', 'employee_code': 'AIS073', 'email': 'amsadmin@abhiyantatech.com', 'dept_code': 'ADMINISTRATION', 'role_name': 'EMPLOYEE'}, {'first_name': 'Akash', 'last_name': 'Dadasaheb Shinde', 'employee_code': 'AIS185', 'email': 'Akash.S@abhiyantatech.com', 'dept_code': 'ACCOUNTS', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Neil', 'last_name': 'Dilip Joglekar', 'employee_code': 'AIS200', 'email': 'Accounts@abhiyantatech.com', 'dept_code': 'ACCOUNTS', 'role_name': 'COURSE_MANAGER'}, {'first_name': 'Chitrarekha', 'last_name': 'Sunil Marne', 'employee_code': 'AIS149', 'email': 'coordinator@abhiyantatech.com', 'dept_code': 'ADMINISTRATION', 'role_name': 'EMPLOYEE'}, {'first_name': 'Pratiksha', 'last_name': 'Barangule', 'employee_code': 'INT050', 'email': 'Pratiksha.B@abhiyantatech.com', 'dept_code': 'SAC', 'role_name': 'EMPLOYEE'}, {'first_name': 'Dhruv', 'last_name': 'Dalal', 'employee_code': 'INT051', 'email': 'Dhruv.D@abhiyantatech.com', 'dept_code': 'AI', 'role_name': 'EMPLOYEE'}, {'first_name': 'Krutika', 'last_name': 'Pise', 'employee_code': 'INT056', 'email': 'Krutika.P@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Payal', 'last_name': 'Randive', 'employee_code': 'INT057', 'email': 'Payal.R@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Atharv', 'last_name': 'Dhavale', 'employee_code': 'INT058', 'email': 'Atharv.D@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Akash', 'last_name': 'Jagdale', 'employee_code': 'INT059', 'email': 'Akash.J@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Mansi', 'last_name': 'Kate', 'employee_code': 'INT061', 'email': 'Mansi.K@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Shweta', 'last_name': 'Jangam', 'employee_code': 'INT064', 'email': 'Shweta.J@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Shalini', 'last_name': 'Saraf', 'employee_code': 'INT065', 'email': 'Shalini.S@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Iramnaaz', 'last_name': 'Shaikh', 'employee_code': 'INT066', 'email': 'Iramnaaz.S@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Gargi', 'last_name': 'Chaurpagar', 'employee_code': 'INT067', 'email': 'Gargi.C@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Unnati', 'last_name': 'Bhamare', 'employee_code': 'INT068', 'email': 'Unnati.B@abhiyantatech.com', 'dept_code': 'FICO', 'role_name': 'EMPLOYEE'}, {'first_name': 'Dhamni', 'last_name': 'Jamwal', 'employee_code': 'INT071', 'email': 'Dhamni.J@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Kavit', 'last_name': 'Gholap', 'employee_code': 'INT072', 'email': 'Kavit.G@abhiyantatech.com', 'dept_code': 'PP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Anita', 'last_name': 'Choudhary', 'employee_code': 'INT074', 'email': 'Anita.C@abhiyantatech.com', 'dept_code': 'DESIGN', 'role_name': 'EMPLOYEE'}, {'first_name': 'Ajinkya', 'last_name': 'Kale', 'employee_code': 'INT075', 'email': 'Ajinkya.K@abhiyantatech.com', 'dept_code': 'SAC', 'role_name': 'EMPLOYEE'}, {'first_name': 'Jayesh', 'last_name': 'Bacchav', 'employee_code': 'INT077', 'email': 'Jayesh.B@abhiyantatech.com', 'dept_code': 'SAC', 'role_name': 'EMPLOYEE'}, {'first_name': 'Arati', 'last_name': 'Dhayagude', 'employee_code': 'INT078', 'email': 'Arati.D@abhiyantatech.com', 'dept_code': 'AI', 'role_name': 'EMPLOYEE'}, {'first_name': 'Samarth', 'last_name': 'Agarwal', 'employee_code': 'INT079', 'email': 'Samarth.A@abhiyantatech.com', 'dept_code': 'AI', 'role_name': 'EMPLOYEE'}, {'first_name': 'Bhavesh', 'last_name': 'Wedhane', 'employee_code': 'INT081', 'email': 'Bhavesh.W@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Mrunal', 'last_name': 'Ingale', 'employee_code': 'INT082', 'email': 'Mrunal.I@abhiyantatech.com', 'dept_code': 'MM', 'role_name': 'EMPLOYEE'}, {'first_name': 'Piyush', 'last_name': 'Marne', 'employee_code': 'INT084', 'email': 'Piyush.M@abhiyantatech.com', 'dept_code': 'SD', 'role_name': 'EMPLOYEE'}, {'first_name': 'Mayur', 'last_name': 'Chaudhari', 'employee_code': 'INT085', 'email': 'Mayur.C@abhiyantatech.com', 'dept_code': 'ABAP', 'role_name': 'EMPLOYEE'}, {'first_name': 'Amey', 'last_name': 'Gokhale', 'employee_code': 'INT087', 'email': 'Amey.G@abhiyantatech.com', 'dept_code': 'BASIS', 'role_name': 'EMPLOYEE'}]

DEFAULT_PASSWORD = "Password123!"

def seed_all_users():
    db = SessionLocal()
    try:
        print("=" * 75)
        print(f"KAIZEN LMS - COMPLETE ENTERPRISE USER SEEDER ({len(ALL_USERS)} USERS)")
        print("=" * 75)

        # 1. Ensure Roles
        print("\n1. Verifying System Roles...")
        roles_dict = {}
        for r_name, r_id in ROLE_MAP.items():
            role = db.query(Role).filter(Role.id == r_id).first()
            if not role:
                role = db.query(Role).filter(Role.name == r_name).first()
            if not role:
                role = Role(id=r_id, name=r_name)
                db.add(role)
                db.commit()
                db.refresh(role)
            roles_dict[r_name] = role
            print(f"   [OK] Role {r_name} (ID: {role.id})")

        # 2. Ensure Departments
        print("\n2. Verifying Departments...")
        depts_dict = {}
        for d_info in STANDARD_DEPTS:
            dept = db.query(Department).filter(Department.code == d_info["code"]).first()
            if not dept:
                dept = Department(
                    id=uuid.uuid4(),
                    code=d_info["code"],
                    name=d_info["name"],
                    description=d_info["desc"]
                )
                db.add(dept)
                db.commit()
                db.refresh(dept)
            depts_dict[d_info["code"]] = dept
            print(f"   [OK] Dept [{dept.code}] {dept.name} (ID: {dept.id})")

        # 3. Upsert Users
        print(f"\n3. Upserting {len(ALL_USERS)} Users (Default Password: '{DEFAULT_PASSWORD}')...")
        hashed_pwd = get_password_hash(DEFAULT_PASSWORD)
        created_count = 0
        updated_count = 0

        for u_data in ALL_USERS:
            email = u_data["email"].strip()
            code = u_data["employee_code"].strip()

            target_dept_id = None
            if u_data.get("dept_code"):
                dept_obj = depts_dict.get(u_data["dept_code"])
                if dept_obj:
                    target_dept_id = dept_obj.id

            target_role = roles_dict.get(u_data["role_name"], roles_dict["EMPLOYEE"])

            # Check if user exists by email or employee_code
            user = db.query(User).filter(User.email.ilike(email)).first()
            if not user:
                user = db.query(User).filter(User.employee_code == code).first()

            if user:
                # Update existing
                user.first_name = u_data["first_name"]
                user.last_name = u_data["last_name"]
                user.employee_code = code
                user.email = email
                user.department_id = target_dept_id
                user.is_active = True
                user.is_deleted = False
                user.email_verified = True
                user.must_change_password = False
                user.password_hash = hashed_pwd

                # Update role
                db.query(UserRole).filter(UserRole.user_id == user.id).delete()
                db.add(UserRole(user_id=user.id, role_id=target_role.id))
                db.commit()
                updated_count += 1
                dept_label = u_data.get('dept_code') or 'Unscoped'
                print(f"   [UPDATED] [{code}] {user.first_name} {user.last_name} ({email}) -> Dept: {dept_label}, Role: {target_role.name}")
            else:
                # Create new
                new_user = User(
                    id=uuid.uuid4(),
                    employee_code=code,
                    first_name=u_data["first_name"],
                    last_name=u_data["last_name"],
                    email=email,
                    password_hash=hashed_pwd,
                    department_id=target_dept_id,
                    is_active=True,
                    is_deleted=False,
                    email_verified=True,
                    must_change_password=False
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)

                db.add(UserRole(user_id=new_user.id, role_id=target_role.id))
                db.commit()
                created_count += 1
                dept_label = u_data.get('dept_code') or 'Unscoped'
                print(f"   [CREATED] [{code}] {new_user.first_name} {new_user.last_name} ({email}) -> Dept: {dept_label}, Role: {target_role.name}")

        print("\n" + "=" * 75)
        print("SEEDING COMPLETE!")
        print(f"   Total Users Processed: {created_count + updated_count}")
        print(f"   Created: {created_count}")
        print(f"   Updated: {updated_count}")
        print("   Excluded: Umesh Shinde (AIS001) - EXPLICITLY SKIPPED")
        print(f"   Default Login Password: {DEFAULT_PASSWORD}")
        print("=" * 75)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during seeding: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_all_users()
