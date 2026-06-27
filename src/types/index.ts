export type Class = {
  id: string;
  gym_id: string;
  name: string;
  instructor: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  capacity: number;
  created_at: string;
};

export type Enrollment = {
  id: string;
  gym_id: string;
  class_id: string;
  member_id: string;
  enrolled_at: string;
};

export type EnrollmentWithMember = Enrollment & {
  members: {
    id: string;
    full_name: string;
    email: string;
  };
};