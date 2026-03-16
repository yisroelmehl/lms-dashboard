export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  displayname: string;
  categoryid: number;
  summary: string;
  startdate: number;
  enddate: number;
  visible: number;
  format: string;
}

export interface MoodleUser {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
  phone1?: string;
  phone2?: string;
  address?: string;
  city?: string;
  country?: string;
  idnumber?: string;
  firstaccess: number;
  lastaccess: number;
  profileimageurl?: string;
  roles?: { roleid: number; shortname: string; name: string }[];
  groups?: { id: number; name: string; description: string }[];
}

export interface MoodleActivityCompletion {
  cmid: number;
  modname: string;
  instance: number;
  state: number; // 0=incomplete, 1=complete, 2=complete_pass, 3=complete_fail
  timecompleted: number;
  tracking: number; // 0=none, 1=manual, 2=auto
  overrideby: number | null;
}

export interface MoodleCompletionResponse {
  statuses: MoodleActivityCompletion[];
}

export interface MoodleGradeItem {
  id: number;
  itemname: string;
  itemtype: string;
  graderaw?: number;
  gradeformatted: string;
  grademin: number;
  grademax: number;
  percentageformatted: string;
  feedback?: string;
}

export interface MoodleGradesTableResponse {
  tables: {
    courseid: number;
    userid: number;
    maxdepth: number;
    tabledata: unknown[];
  }[];
}

export interface MoodleCalendarEvent {
  id: number;
  name: string;
  description: string;
  courseid: number;
  groupid: number;
  userid: number;
  modulename: string;
  instance: number;
  eventtype: string;
  timestart: number;
  timeduration: number;
  visible: number;
  timemodified: number;
}

export interface MoodleCalendarResponse {
  events: MoodleCalendarEvent[];
}

export interface MoodleQuizAttempt {
  id: number;
  quiz: number;
  userid: number;
  attempt: number;
  uniqueid: number;
  state: string; // "inprogress" | "finished" | "abandoned"
  timestart: number;
  timefinish: number;
  timemodified: number;
  sumgrades: number;
}

export interface MoodleError {
  exception: string;
  errorcode: string;
  message: string;
}
