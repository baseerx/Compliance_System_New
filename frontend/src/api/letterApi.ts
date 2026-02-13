import axios from "axios";

export interface Letter {
  _id: string;
  title: string;
  status: "draft" | "in-progress" | "forwarded" | "completed" | "overdue" | "active";
  priority: "high" | "medium" | "low" | "urgent";
  created_at: string;
  due_date: string;

  recurrence_type?: "days" | "weeks" | "months" | "years";
  recurrence_value?: number;
  next_due_date?: string;

  file?: string;
  sender?: string;
  receiver?: string;
  created_by?: string;
}

export interface LettersResponse {
  letters: Letter[];
}

export const fetchLetters = async (): Promise<Letter[]> => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  
  const res = await axios.get("http://127.0.0.1:9002/api/letters/", {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    }
  });

  if (Array.isArray(res.data)) {
    return res.data;
  }

  if (res.data?.letters && Array.isArray(res.data.letters)) {
    return res.data.letters;
  }

  return [];
};