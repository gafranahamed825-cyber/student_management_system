document.addEventListener('DOMContentLoaded', () => {
    const studentForm = document.getElementById('student-form');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const studentTableBody = document.getElementById('student-table-body');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const formTitle = document.getElementById('form-title');
    const formMessage = document.getElementById('form-message');
    const studentIdInput = document.getElementById('studentId');
    let messageTimeout;

    function showMessage(message, type = 'success') {
        if (!formMessage) return;
        clearTimeout(messageTimeout);
        formMessage.textContent = message;
        formMessage.className = `form-message show ${type === 'error' ? 'message-error' : 'message-success'}`;
        messageTimeout = setTimeout(() => {
            formMessage.classList.remove('show');
            messageTimeout = setTimeout(() => {
                if (formMessage) formMessage.style.display = 'none';
            }, 220);
        }, 4000);
        formMessage.style.display = 'block';
    }

    // Fetch and display students records
    async function loadStudents() {
        const search = searchInput.value;
        const sortBy = sortSelect.value;
        
        const response = await fetch(`/students?search=${encodeURIComponent(search)}&sortBy=${sortBy}`);
        const students = await response.json();
        
        studentTableBody.innerHTML = '';
        students.forEach(student => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.studentId}</td>
                <td>${student.firstName}</td>
                <td>${student.lastName}</td>
                <td><span class="cell-truncate">${student.email}</span></td>
                <td>${student.course}</td>
                <td>${student.batch}</td>
                <td>${student.age}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="setupEdit('${student.studentId}', '${student.firstName}', '${student.lastName}', '${student.email}', '${student.course}', '${student.batch}', ${student.age})">Edit</button>
                        <button class="btn-delete" onclick="deleteStudent('${student.studentId}')">Delete</button>
                    </div>
                </td>
            `;
            studentTableBody.appendChild(row);
        });
    }

    // Submit handler for both Create & Update
    studentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const isEdit = document.getElementById('is-edit').value === 'true';
        
        const payload = {
            studentId: studentIdInput.value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            course: document.getElementById('course').value,
            batch: document.getElementById('batch').value,
            age: document.getElementById('age').value
        };

        let response;
        if (isEdit) {
            response = await fetch(`/students/${payload.studentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch('/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }

        const result = await response.json();
        if (response.ok) {
            showMessage(result.message, 'success');
            resetForm();
            loadStudents();
            loadPanelChart();
        } else {
            showMessage(result.error || 'Something went wrong', 'error');
        }
    });

    // Delete Student
    window.deleteStudent = async (id) => {
        if (confirm('Are you sure you want to delete this record?')) {
            const response = await fetch(`/students/${id}`, { method: 'DELETE' });
            const result = await response.json();
            showMessage(result.message, 'success');
            loadStudents();
            loadPanelChart();
        }
    };

    // Transition form to edit mode
    window.setupEdit = (id, firstName, lastName, email, course, batch, age) => {
        formTitle.textContent = "🎓 Edit Student Details";
        document.getElementById('is-edit').value = 'true';
        studentIdInput.value = id;
        
        document.getElementById('firstName').value = firstName;
        document.getElementById('lastName').value = lastName;
        document.getElementById('email').value = email;
        document.getElementById('course').value = course;
        document.getElementById('batch').value = batch;
        document.getElementById('age').value = age;
        
        submitBtn.textContent = "Update";
        cancelBtn.textContent = "Cancel Edit";
        cancelBtn.style.display = "inline-flex";
    };

    async function loadPanelChart() {
        try {
            const resp = await fetch('/students');
            const all = await resp.json();
            const chart = document.getElementById('course-chart');
            const summaryTotal = document.getElementById('summary-total');
            const summaryCourses = document.getElementById('summary-courses');
            const summaryTop = document.getElementById('summary-top');
            if (!chart) return;
            const counts = all.reduce((acc, s) => {
                acc[s.course] = (acc[s.course] || 0) + 1;
                return acc;
            }, {});
            const totalStudents = all.length;
            const courseCount = Object.keys(counts).length;
            const topCount = Math.max(...Object.values(counts), 0);
            if (summaryTotal) summaryTotal.textContent = totalStudents;
            if (summaryCourses) summaryCourses.textContent = courseCount;
            if (summaryTop) summaryTop.textContent = topCount;
            const maxCount = Math.max(topCount, 1);
            chart.innerHTML = '';
            Object.entries(counts).sort((a,b) => b[1]-a[1]).forEach(([course, count]) => {
                const item = document.createElement('div');
                item.className = 'chart-bar';
                const label = document.createElement('div');
                label.className = 'chart-bar-label';
                label.textContent = course;
                const track = document.createElement('div');
                track.className = 'chart-bar-track';
                const fill = document.createElement('div');
                fill.className = 'chart-bar-fill';
                fill.style.width = `${Math.max(Math.round((count / maxCount) * 100), 10)}%`;
                fill.style.height = '100%';
                track.appendChild(fill);
                const value = document.createElement('div');
                value.className = 'chart-bar-value';
                value.textContent = count;
                item.appendChild(label);
                item.appendChild(track);
                item.appendChild(value);
                chart.appendChild(item);
            });
        } catch (err) {
            console.error('Failed to load panel chart', err);
        }
    }

    function resetForm() {
        studentForm.reset();
        formTitle.textContent = "🎓 Register New Student";
        document.getElementById('is-edit').value = 'false';
        studentIdInput.disabled = false;
        submitBtn.textContent = "Register Student";
        cancelBtn.style.display = "none";
    }

    cancelBtn.addEventListener('click', resetForm);
    searchInput.addEventListener('input', loadStudents);
    sortSelect.addEventListener('change', loadStudents);

    // Initial Data Fetch
    loadStudents();
    loadPanelChart();
});
