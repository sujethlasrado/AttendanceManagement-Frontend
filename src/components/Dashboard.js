import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { jsPDF } from "jspdf"; // Import jsPDF

const Dashboard = () => {
  const [studentData, setStudentData] = useState([]);
  const [studentForm, setStudentForm] = useState({
    name: "",
    rollNo: "",
    course: "",
    semester: "",
    branch: "",
  });
  const [attendance, setAttendance] = useState({});
  const [attendanceByCourse, setAttendanceByCourse] = useState([]);
  const [course, setCourse] = useState("");
  const todayDate = new Date().toISOString().split("T")[0];
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [useTodayDate, setUseTodayDate] = useState(true); // Default to using todayDate
  const [attendanceSummary, setAttendanceSummary] = useState({});

  const headingStyle = {
    fontFamily: "'Roboto', sans-serif",
    fontWeight: "bold",
    color: "#2c3e50",
    background: "linear-gradient(45deg, #ff6347, #ffcc00)",
    padding: "10px 20px",
    borderRadius: "5px",
    textAlign: "center",
    textShadow: "2px 2px 5px rgba(0, 0, 0, 0.3)",
    letterSpacing: "2px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/students");
        if (!response.ok) {
          throw new Error("Failed to fetch students.");
        }
        const data = await response.json();
        setStudentData(data);
      } catch (error) {
        setMessage(error.message);
      }
    };
    fetchStudents();
  }, []);

  const handleStudentFormChange = (e) => {
    setStudentForm({ ...studentForm, [e.target.name]: e.target.value });
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    if (Object.values(studentForm).some((field) => field === "")) {
      setMessage("Please fill out all fields.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8080/api/students/addstudent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
          },
          body: JSON.stringify(studentForm),
        }
      );
      if (response.ok) {
        const newStudent = await response.json();
        setStudentData([...studentData, newStudent]);
        setStudentForm({
          name: "",
          rollNo: "",
          course: "",
          semester: "",
          branch: "",
        });
        setMessage("Student added successfully!");
      } else {
        throw new Error("Failed to add student.");
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  const markAttendance = async (rollNo, status) => {
    const dateToSend = useTodayDate ? todayDate : selectedDate;

    try {
      const response = await fetch(
        `http://localhost:8080/api/students/${rollNo}/attendance`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
          },
          body: JSON.stringify({ date: dateToSend, status }),
        }
      );

      if (response.ok) {
        setAttendance((prevAttendance) => ({
          ...prevAttendance,
          [rollNo]: status,
        }));
        setMessage(
          `Attendance marked as ${status} for Roll No: ${rollNo} on ${dateToSend}`
        );
      } else {
        throw new Error("Failed to mark attendance.");
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  const fetchAttendanceByCourse = async () => {
    if (!course) {
      setMessage("Please enter a course name.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/students/attendance/course/${course}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch attendance for the course.");
      }
      const data = await response.json();
      setAttendanceByCourse(data);
      setMessage(`Attendance data fetched for course: ${course}`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Attendance Report for Course: ${course}`, 20, 20);

    doc.setFontSize(12);
    doc.text("Sr. No.", 20, 30);
    doc.text("Roll No", 40, 30);
    doc.text("Status", 100, 30);
    doc.text("Date", 160, 30);

    attendanceByCourse.forEach((record, index) => {
      const yPosition = 40 + index * 10;
      doc.text((index + 1).toString(), 20, yPosition);
      doc.text(record.rollNo.toString(), 40, yPosition);
      doc.text(record.status, 100, yPosition);
      doc.text(record.date, 160, yPosition);
    });

    doc.save(`attendance_report_${course}.pdf`);
  };

  // Calculate Attendance Summary
  const calculateAttendanceSummary = (rollNo) => {
    const records = attendanceByCourse.filter(
      (record) => record.rollNo === rollNo
    );
    const totalPresent = records.filter((record) => record.status === "Present").length;
    const totalAbsent = records.filter((record) => record.status === "Absent").length;

    // Calculate Percentage
    const totalClasses = totalPresent + totalAbsent;
    const attendancePercentage = totalClasses
      ? (totalPresent / totalClasses) * 100
      : 0;

    return { totalPresent, totalAbsent, attendancePercentage };
  };

  // Refresh Attendance Summary
  const refreshAttendanceSummary = () => {
    const updatedSummary = studentData.reduce((acc, student) => {
      const { totalPresent, totalAbsent, attendancePercentage } = calculateAttendanceSummary(student.rollNo);
      acc[student.rollNo] = { totalPresent, totalAbsent, attendancePercentage };
      return acc;
    }, {});
    setAttendanceSummary(updatedSummary);
  };

  function deleteRecord(recordId) {
    fetch(`http://localhost:8080/api/students/delete/${recordId}`, {
        method: "DELETE",
    })
        .then((response) => {
            if (response.ok) {
                alert("Attendance record deleted successfully.");
                
                // Remove the deleted record from the state
                setAttendanceByCourse((prevAttendance) =>
                    prevAttendance.filter((record) => record.id !== recordId)
                );
            } else {
                response.text().then((text) => alert(text));
            }
        })
        .catch((error) => console.error("Error:", error));
}


  return (
    <div className="container my-4">
      <h1 style={headingStyle}>Attendance Management System</h1>
      {/* Feedback Message */}
      {message && (
        <div className="alert alert-info text-center" role="alert">
          {message}
        </div>
      )}

      {/* Add Student Form */}
      <div className="card mb-4">
        <div className="card-header">Add a New Student</div>
        <div className="card-body">
          <form onSubmit={handleStudentSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  placeholder="Student Name"
                  onChange={handleStudentFormChange}
                  required
                  value={studentForm.name}
                />
              </div>
              <div className="col-md-6">
                <input
                  type="number"
                  name="rollNo"
                  className="form-control"
                  placeholder="Roll No"
                  onChange={handleStudentFormChange}
                  required
                  value={studentForm.rollNo}
                />
              </div>
              <div className="col-md-4">
                <input
                  type="text"
                  name="course"
                  className="form-control"
                  placeholder="Course"
                  onChange={handleStudentFormChange}
                  required
                  value={studentForm.course}
                />
              </div>
              <div className="col-md-4">
                <input
                  type="text"
                  name="semester"
                  className="form-control"
                  placeholder="Semester"
                  onChange={handleStudentFormChange}
                  required
                  value={studentForm.semester}
                />
              </div>
              <div className="col-md-4">
                <input
                  type="text"
                  name="branch"
                  className="form-control"
                  placeholder="Branch"
                  onChange={handleStudentFormChange}
                  required
                  value={studentForm.branch}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-3">
              Add Student
            </button>
          </form>
        </div>
      </div>

      {/* Attendance Section */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Mark Attendance</h5>
          <div>
            {/* Toggle for Using Today's Date */}
            <label className="form-check-label me-3">
              <input
                type="checkbox"
                className="form-check-input me-2"
                checked={useTodayDate}
                onChange={(e) => setUseTodayDate(e.target.checked)}
              />
              Use Today's Date
            </label>

            {/* Date Picker for Custom Date (visible only when toggle is unchecked) */}
            {!useTodayDate && (
              <input
                id="attendanceDate"
                type="date"
                className="form-control w-auto d-inline"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ cursor: "pointer" }}
              />
            )}
          </div>
        </div>
        <div className="card-body">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Name</th>
                <th>Roll No</th>
                <th>Course</th>
                <th>Semester</th>
                <th>Branch</th>
                <th>Attendance</th>
                <th>Attendance Summary</th> {/* New Column */}
              </tr>
            </thead>
            <tbody>
              {studentData.map((student, index) => {
                const { totalPresent, totalAbsent, attendancePercentage } =
                  attendanceSummary[student.rollNo] || { totalPresent: 0, totalAbsent: 0, attendancePercentage: 0 };
                return (
                  <tr key={student.id}>
                    <td>{index + 1}</td>
                    <td>{student.name}</td>
                    <td>{student.rollNo}</td>
                    <td>{student.course}</td>
                    <td>{student.semester}</td>
                    <td>{student.branch}</td>
                    <td>
                      <button
                        className="btn btn-success btn-sm me-2"
                        onClick={() => markAttendance(student.rollNo, "Present")}
                      >
                        Present
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => markAttendance(student.rollNo, "Absent")}
                      >
                        Absent
                      </button>
                    </td>
                    <td>
                      {/* Display Attendance Summary with Percentage */}
                      <div>Present: {totalPresent}</div>
                      <div>Absent: {totalAbsent}</div>
                      <div>Percentage: {attendancePercentage.toFixed(2)}%</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Refresh Summary Button */}
          <button className="btn btn-warning mt-3" onClick={refreshAttendanceSummary}>
            Refresh Attendance Summary
          </button>
        </div>
      </div>

      {/* Fetch Attendance by Course */}
      <div className="card mb-4">
        <div className="card-header">Fetch Attendance by Course</div>
        <div className="card-body">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Enter Course Name"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={fetchAttendanceByCourse}
            >
              Fetch Attendance
            </button>
          </div>
        </div>
      </div>

    {/* Display Fetched Attendance */}
{attendanceByCourse.length > 0 && (
  <div className="card">
    <div className="card-header">Attendance for Course: {course}</div>
    <div className="card-body">
      <table className="table table-striped">
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>Roll No</th>
            <th>Student Name</th>
            <th>Course</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th> {/* New column for actions */}
          </tr>
        </thead>
        <tbody>
    {attendanceByCourse.map((record, index) => (
        <tr key={record.id}>
            <td>{index + 1}</td>
            <td>{record.rollNo}</td>
            <td>{record.name}</td>
            <td>{record.course}</td>
            <td>{record.status}</td>
            <td>{record.date}</td>
            <td>
                <button
                    className="btn btn-danger"
                    onClick={() => deleteRecord(record.id)}
                >
                    Delete
                </button>
            </td>
        </tr>
    ))}
</tbody>
      </table>

      {/* PDF Generation Button */}
      <button className="btn btn-success" onClick={generatePDF}>
        Generate PDF Report
      </button>
    </div>
  </div>
)}


      {/* Logout Button */}
      <button
        className="btn btn-secondary mt-3"
        onClick={() => (window.location.href = "/login")}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
