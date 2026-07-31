import express from 'express';
import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 80;

// Replicate __dirname functionality for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB Configuration
const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'student_db';
const COLLECTION_NAME = 'student_data';

let db, studentsCollection;

function normalizeStudentId(id) {
  if (!id) return id;
  const clean = String(id).trim();
  const digits = clean.replace(/^STU/i, '').trim();
  if (/^\d+$/.test(digits)) {
    return 'STU' + digits.padStart(3, '0');
  }
  return clean;
}

function studentIdQuery(id) {
  const normalized = normalizeStudentId(id);
  const digitsOnly = normalized.replace(/^STU/i, '');
  return {
    $or: [
      { studentId: normalized },
      { studentId: digitsOnly }
    ]
  };
}

// Connect to MongoDB natively
MongoClient.connect(MONGO_URI)
  .then(client => {
    db = client.db(DB_NAME);
    studentsCollection = db.collection(COLLECTION_NAME);
    console.log(`Connected to Database: "${DB_NAME}", Collection: "${COLLECTION_NAME}"`);
  })
  .catch(error => console.error('Failed to connect to Database:', error));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// GET /students (With Search, Filtering & Sorting)
app.get('/students', async (req, res) => {
  try {
    const { search, sortBy } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { course: { $regex: search, $options: 'i' } }
        ]
      };
    }

    let sortOption = { studentId: 1 }; 
    if (sortBy === 'name_asc') sortOption = { firstName: 1 };
    if (sortBy === 'name_desc') sortOption = { firstName: -1 };
    if (sortBy === 'age_low') sortOption = { age: 1 };
    if (sortBy === 'age_high') sortOption = { age: -1 };

    const students = await studentsCollection.find(query).sort(sortOption).toArray();
    const normalizedStudents = students.map(student => ({
      ...student,
      studentId: normalizeStudentId(student.studentId)
    }));
    res.status(200).json(normalizedStudents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /students (Insert Student)
app.post('/students', async (req, res) => {
  try {
    const studentData = req.body;
    studentData.age = parseInt(studentData.age, 10);
    studentData.studentId = normalizeStudentId(studentData.studentId);

    const existing = await studentsCollection.findOne(studentIdQuery(studentData.studentId));
    if (existing) {
      return res.status(400).json({ error: "Student ID already exists!" });
    }

    const result = await studentsCollection.insertOne(studentData);
    res.status(201).json({ message: "Student registered successfully", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /students/:id (Update Student)
app.put('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    if (updateData.age) updateData.age = parseInt(updateData.age, 10);
    if (updateData.studentId) {
      updateData.studentId = normalizeStudentId(updateData.studentId);
    }

    const result = await studentsCollection.updateOne(
      studentIdQuery(id),
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.status(200).json({ message: "Student updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /students/:id (Delete Student)
app.delete('/students/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await studentsCollection.deleteOne(studentIdQuery(id));

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
