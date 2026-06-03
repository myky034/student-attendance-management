import type { Student } from '../types';

export const initialStudents: Student[] = [
  {
    id: 'STU001',
    name: 'Emma Johnson',
    email: 'emma.johnson@school.edu',
    class: 'Class 10A',
    attendanceRecords: [
      { date: '2026-06-02', status: 'present', timestamp: '08:30 AM' },
      { date: '2026-06-01', status: 'present', timestamp: '08:25 AM' },
      { date: '2026-05-31', status: 'absent', timestamp: '-' },
      { date: '2026-05-30', status: 'present', timestamp: '08:35 AM' },
    ],
  },
  {
    id: 'STU002',
    name: 'Liam Smith',
    email: 'liam.smith@school.edu',
    class: 'Class 10A',
    attendanceRecords: [
      { date: '2026-06-02', status: 'present', timestamp: '08:28 AM' },
      { date: '2026-06-01', status: 'present', timestamp: '08:30 AM' },
      { date: '2026-05-31', status: 'present', timestamp: '08:22 AM' },
      { date: '2026-05-30', status: 'present', timestamp: '08:40 AM' },
    ],
  },
  {
    id: 'STU003',
    name: 'Olivia Williams',
    email: 'olivia.williams@school.edu',
    class: 'Class 10B',
    attendanceRecords: [
      { date: '2026-06-02', status: 'present', timestamp: '08:32 AM' },
      { date: '2026-06-01', status: 'absent', timestamp: '-' },
      { date: '2026-05-31', status: 'present', timestamp: '08:27 AM' },
      { date: '2026-05-30', status: 'present', timestamp: '08:33 AM' },
    ],
  },
  {
    id: 'STU004',
    name: 'Noah Brown',
    email: 'noah.brown@school.edu',
    class: 'Class 10B',
    attendanceRecords: [
      { date: '2026-06-02', status: 'present', timestamp: '08:26 AM' },
      { date: '2026-06-01', status: 'present', timestamp: '08:29 AM' },
      { date: '2026-05-31', status: 'present', timestamp: '08:31 AM' },
      { date: '2026-05-30', status: 'absent', timestamp: '-' },
    ],
  },
  {
    id: 'STU005',
    name: 'Ava Davis',
    email: 'ava.davis@school.edu',
    class: 'Class 10A',
    attendanceRecords: [
      { date: '2026-06-02', status: 'absent', timestamp: '-' },
      { date: '2026-06-01', status: 'present', timestamp: '08:27 AM' },
      { date: '2026-05-31', status: 'present', timestamp: '08:29 AM' },
      { date: '2026-05-30', status: 'present', timestamp: '08:36 AM' },
    ],
  },
  {
    id: 'STU006',
    name: 'Ethan Martinez',
    email: 'ethan.martinez@school.edu',
    class: 'Class 10C',
    attendanceRecords: [
      { date: '2026-06-02', status: 'present', timestamp: '08:31 AM' },
      { date: '2026-06-01', status: 'present', timestamp: '08:28 AM' },
      { date: '2026-05-31', status: 'present', timestamp: '08:30 AM' },
      { date: '2026-05-30', status: 'present', timestamp: '08:38 AM' },
    ],
  },
  {
    id: 'STU007',
    name: 'Sophia Garcia',
    email: 'sophia.garcia@school.edu',
    class: 'Class 10C',
    attendanceRecords: [
      { date: '2026-06-02', status: 'present', timestamp: '08:29 AM' },
      { date: '2026-06-01', status: 'present', timestamp: '08:26 AM' },
      { date: '2026-05-31', status: 'absent', timestamp: '-' },
      { date: '2026-05-30', status: 'present', timestamp: '08:34 AM' },
    ],
  },
  {
    id: 'STU008',
    name: 'Mason Rodriguez',
    email: 'mason.rodriguez@school.edu',
    class: 'Class 10A',
    attendanceRecords: [
      { date: '2026-06-02', status: 'present', timestamp: '08:33 AM' },
      { date: '2026-06-01', status: 'absent', timestamp: '-' },
      { date: '2026-05-31', status: 'present', timestamp: '08:28 AM' },
      { date: '2026-05-30', status: 'present', timestamp: '08:37 AM' },
    ],
  },
  {
    id: 'STU009',
    name: 'Isabella Wilson',
    email: 'isabella.wilson@school.edu',
    class: 'Class 10B',
    attendanceRecords: [
      { date: '2026-06-02', status: 'present', timestamp: '08:27 AM' },
      { date: '2026-06-01', status: 'present', timestamp: '08:31 AM' },
      { date: '2026-05-31', status: 'present', timestamp: '08:26 AM' },
      { date: '2026-05-30', status: 'present', timestamp: '08:39 AM' },
    ],
  },
  {
    id: 'STU010',
    name: 'James Anderson',
    email: 'james.anderson@school.edu',
    class: 'Class 10C',
    attendanceRecords: [
      { date: '2026-06-02', status: 'present', timestamp: '08:34 AM' },
      { date: '2026-06-01', status: 'present', timestamp: '08:32 AM' },
      { date: '2026-05-31', status: 'present', timestamp: '08:33 AM' },
      { date: '2026-05-30', status: 'absent', timestamp: '-' },
    ],
  },
];
