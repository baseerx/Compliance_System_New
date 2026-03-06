import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Chip,
  TextField,
  InputAdornment,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import api from "../../api/axios";

interface Letter {
  id: number;
  ref_no: string;
  subject: string;
  sender?: string;
  receiver?: string;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at?: string;
  recurrence_type?: string;
  recurrence_value?: number;
  user_id?: number;
  created_by?: string;
}

const FilteredDocs: React.FC = () => {
  const { filterType } = useParams<{ filterType: string }>();
  const navigate = useNavigate();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [filteredLetters, setFilteredLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchFilteredLetters();
  }, [filterType]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLetters(letters);
      return;
    }
    const search = searchTerm.toLowerCase();
    const filtered = letters.filter((letter) =>
      letter.ref_no?.toLowerCase().includes(search) ||
      letter.subject?.toLowerCase().includes(search) ||
      letter.sender?.toLowerCase().includes(search) ||
      letter.receiver?.toLowerCase().includes(search) ||
      letter.category?.toLowerCase().includes(search) ||
      letter.status?.toLowerCase().includes(search) ||
      letter.priority?.toLowerCase().includes(search) ||
      letter.created_by?.toLowerCase().includes(search)
    );
    setFilteredLetters(filtered);
  }, [searchTerm, letters]);

  const fetchFilteredLetters = async () => {
    try {
      setLoading(true);

      const userStr = localStorage.getItem("user");
      let userIsSuperAdmin = false;

      if (userStr) {
        const user = JSON.parse(userStr);
        userIsSuperAdmin =
          user.superadmin === 1 ||
          user.superadmin === true ||
          user.is_superuser === true;
        setIsSuperAdmin(userIsSuperAdmin);
      }

      const endpoint = userIsSuperAdmin ? "/letters/all/" : "/letters/";
      const res = await api.get(endpoint);
      const allLetters: Letter[] = res.data;

      const now = new Date();

      const activeLetters = allLetters.filter(
        (l) => l.status !== "pending" && l.status !== "draft"
      );

      let filtered: Letter[] = [];

      switch (filterType) {
        case "total":
          filtered = allLetters;
          break;

        case "upcoming":
          filtered = activeLetters.filter(
            (l) => l.due_date && new Date(l.due_date) > now && l.status !== "completed"
          );
          break;

        case "overdue":
          filtered = activeLetters.filter(
            (l) => l.due_date && new Date(l.due_date) < now && l.status !== "completed"
          );
          break;

        case "recurring":
          filtered = activeLetters.filter((l) => {
            const hasType =
              l.recurrence_type &&
              l.recurrence_type !== "" &&
              l.recurrence_type !== "none" &&
              l.recurrence_type.toLowerCase() !== "null";
            const hasValue =
              l.recurrence_value !== null &&
              l.recurrence_value !== undefined &&
              l.recurrence_value > 0;
            return hasType && hasValue;
          });
          break;

        default:
          filtered = allLetters;
      }

      setLetters(filtered);
      setFilteredLetters(filtered);
    } catch (err) {
      console.error("❌ Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (filterType) {
      case "total":     return "All Tasks";
      case "upcoming":  return "Upcoming Due Tasks";
      case "overdue":   return "Overdue Tasks";
      case "recurring": return "Recurring Tasks";
      default:          return "Tasks";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":   return { bg: "#4caf50", text: "white" };
      case "in-progress": return { bg: "#2196f3", text: "white" };
      case "draft":       return { bg: "#9e9e9e", text: "white" };
      case "forwarded":   return { bg: "#9c27b0", text: "white" };
      case "pending":     return { bg: "#ff9800", text: "white" };
      case "overdue":     return { bg: "#f44336", text: "white" };
      case "rejected":    return { bg: "#795548", text: "white" };
      default:            return { bg: "#757575", text: "white" };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return { bg: "#f44336", text: "white" };
      case "high":   return { bg: "#ff9800", text: "white" };
      case "medium": return { bg: "#ffc107", text: "white" };
      case "low":    return { bg: "#4caf50", text: "white" };
      default:       return { bg: "#9e9e9e", text: "white" };
    }
  };

  const getEmptyMessage = () => {
    if (searchTerm) return "Try adjusting your search terms";
    switch (filterType) {
      case "recurring": return "No recurring tasks available";
      case "overdue":   return "No overdue tasks — great job!";
      case "upcoming":  return "No upcoming due tasks";
      default:          return "No tasks found";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress sx={{ color: "#1a237e" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: "1400px", margin: "0 auto" }}>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <div>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e", mb: 1 }}>
              {getTitle()}
            </Typography>
            <Typography variant="body2" sx={{ color: "#666" }}>
              {isSuperAdmin
                ? `System-wide view: Showing ${filteredLetters.length} of ${letters.length} tasks`
                : `Your tasks: Showing ${filteredLetters.length} of ${letters.length} tasks`}
            </Typography>
          </div>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/dashboard")}
            sx={{
              borderColor: "#1a237e",
              color: "#1a237e",
              "&:hover": { borderColor: "#0d47a1", backgroundColor: "#e8eaf6" },
            }}
          >
            Back
          </Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by Ref No, Subject, Sender, Receiver, Category, Status, Priority, or Created By..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#1a237e" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              backgroundColor: "white",
              borderRadius: 2,
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset":   { borderColor: "#1a237e" },
                "&.Mui-focused fieldset": { borderColor: "#1a237e" },
              },
            }}
          />
        </Box>

        <TableContainer
          component={Paper}
          sx={{ borderRadius: 3, boxShadow: "0 4px 6px rgba(0,0,0,0.1)", overflow: "hidden" }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#1a237e" }}>
                {["Ref No", "Subject", "Sender", "Receiver", "Category", "Status", "Priority", "Due Date", "Created By"].map(h => (
                  <TableCell key={h} sx={{ color: "white", fontWeight: "bold" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredLetters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Box sx={{ py: 6 }}>
                      <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                        {searchTerm ? "No results found" : "No tasks found"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getEmptyMessage()}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLetters.map((letter, index) => {
                  const sc = getStatusColor(letter.status);
                  const pc = getPriorityColor(letter.priority);

                  return (
                    <TableRow
                      key={letter.id}
                      hover
                      sx={{
                        backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9f9f9",
                        "&:hover": { backgroundColor: "#e3f2fd !important" },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500, color: "#1a237e" }}>
                        {letter.ref_no}
                      </TableCell>

                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="body2" noWrap>{letter.subject}</Typography>
                      </TableCell>

                      <TableCell>{letter.sender || "—"}</TableCell>
                      <TableCell>{letter.receiver || "—"}</TableCell>

                      <TableCell>
                        <Chip label={letter.category} size="small" sx={{ backgroundColor: "#e0e0e0", fontWeight: 500 }} />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={letter.status}
                          size="small"
                          sx={{ backgroundColor: sc.bg, color: sc.text, fontWeight: "bold", textTransform: "capitalize" }}
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={letter.priority}
                          size="small"
                          sx={{ backgroundColor: pc.bg, color: pc.text, fontWeight: "bold", textTransform: "capitalize" }}
                        />
                      </TableCell>

                      <TableCell>
                        {letter.due_date ? (
                          <Typography variant="body2" sx={{ fontWeight: 500, color: "#1a237e" }}>
                            {new Date(letter.due_date).toLocaleDateString()}
                          </Typography>
                        ) : "—"}
                      </TableCell>

                      <TableCell>{letter.created_by || "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

      </Box>
    </Box>
  );
};

export default FilteredDocs;