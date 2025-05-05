
-- Создаём пользовательский тип для роли
CREATE TYPE role_type AS ENUM ('Student', 'Teacher', 'Admin', 'Moderator', 'Parent');

-- Таблица Users
CREATE TABLE Users (
  UserID SERIAL PRIMARY KEY,
  FullName VARCHAR(255),
  Email VARCHAR(255) UNIQUE NOT NULL,
  PasswordHash VARCHAR(255) NOT NULL,
  Role role_type NOT NULL,
  RegistrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  IsActive BOOLEAN DEFAULT TRUE
);

-- Таблица Courses
CREATE TABLE Courses (
  CourseID SERIAL PRIMARY KEY,
  Title VARCHAR(255) NOT NULL,
  Description TEXT,
  StartDate DATE,
  EndDate DATE,
  TeacherID INTEGER REFERENCES Users(UserID)
);

-- Таблица CourseEnrollments
CREATE TABLE CourseEnrollments (
  EnrollmentID SERIAL PRIMARY KEY,
  UserID INTEGER REFERENCES Users(UserID),
  CourseID INTEGER REFERENCES Courses(CourseID),
  EnrolledAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица Lessons
CREATE TABLE Lessons (
  LessonID SERIAL PRIMARY KEY,
  CourseID INTEGER REFERENCES Courses(CourseID),
  Title VARCHAR(255) NOT NULL,
  Content TEXT,
  Date DATE
);

-- Таблица Homeworks
CREATE TABLE Homeworks (
  HomeworkID SERIAL PRIMARY KEY,
  LessonID INTEGER REFERENCES Lessons(LessonID),
  TaskText TEXT NOT NULL,
  Deadline DATE
);

-- Таблица HomeworkSubmissions
CREATE TABLE HomeworkSubmissions (
  SubmissionID SERIAL PRIMARY KEY,
  HomeworkID INTEGER REFERENCES Homeworks(HomeworkID),
  UserID INTEGER REFERENCES Users(UserID),
  AnswerFilePath VARCHAR(255),
  SubmittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Grade FLOAT,
  Feedback TEXT,
  CheckedBy INTEGER REFERENCES Users(UserID)
);

-- Создаём пользовательский тип для статуса
CREATE TYPE status_type AS ENUM ('Open', 'In Progress', 'Closed');

-- Таблица SupportRequests
CREATE TABLE SupportRequests (
  RequestID SERIAL PRIMARY KEY,
  UserID INTEGER REFERENCES Users(UserID),
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Status status_type DEFAULT 'Open',
  Topic VARCHAR(255),
  MessageText TEXT
);

-- Таблица Messages
CREATE TABLE Messages (
  MessageID SERIAL PRIMARY KEY,
  FromUserID INTEGER REFERENCES Users(UserID),
  ToUserID INTEGER REFERENCES Users(UserID),
  MessageText TEXT,
  SentAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);