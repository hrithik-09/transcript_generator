const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const xlsx = require("xlsx");
const fs = require("fs");
const { app: electronApp } = require("electron"); 

const isPackaged = electronApp ? electronApp.isPackaged : false;
const baseDir = isPackaged ? path.join(process.resourcesPath, "app") : __dirname;
const uploadsDir = isPackaged
  ? path.join(electronApp.getPath("userData"), "uploads")
  : path.join(baseDir, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(baseDir, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(baseDir, "views"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const excelFilePath = path.join(uploadsDir, req.file.filename);


    const workbook = xlsx.readFile(excelFilePath);
    const sheetName = workbook.SheetNames[0]; 
    const worksheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    
    let students = [];
    
    
    for (let i =4 ; i < worksheet.length; i++) {  
      const row = worksheet[i];
    
      let student = {
        rollNumber: row[1], 
        name: row[2],       
        courses: [],
        spi: row[worksheet[0].indexOf('SPI')],
        cpi: row[worksheet[0].indexOf('CPI')] 
      };
      
      
      let totalCreditIndex = worksheet[0].indexOf('TOTAL CREDIT');
      
      for (let col = 3; col < totalCreditIndex; col=col+5) {  
        if (row[col + 3] && row[col + 3] !== '') {
          student.courses.push({
            title: worksheet[0][col],
            code: worksheet[1][col],   
            unit: worksheet[2][col], 
            grade: row[col+3],
            remarks:row[col]               
          });
        }
      }
      
      students.push(student);
    }

    const inputDate = new Date(req.body.issueDate); 
    const formattedDate = inputDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const academicDetails = {
      programme: req.body.programme,
      discipline: req.body.discipline,
      semester: req.body.semester,
      academicYear: req.body.academicYear,
      issueDate: formattedDate  
    };
    
    res.render('transcript.ejs', { students: students, academicDetails: academicDetails });

  } catch (error) {
    console.error("Error processing the file: ", error);
    res.status(500).send("Internal Server Error");
  }
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports=app;