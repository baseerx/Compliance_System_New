import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Typography, Button,
  CircularProgress, Chip, TextField, InputAdornment,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon    from "@mui/icons-material/Search";
import api from "../../api/axios";

interface Letter {
  id: number;
  ref_no: string;
  subject: string;
  department?: string;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at?: string;
  created_by?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":   return { bg: "#4caf50", text: "white" };
    case "in-progress": return { bg: "#2196f3", text: "white" };
    case "draft":       return { bg: "#9e9e9e", text: "white" };
    case "pending":     return { bg: "#ff9800", text: "white" };
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

export default function DepartmentTasks() {
  const { deptName } = useParams<{ deptName: string }>();
  const navigate      = useNavigate();

  const [allLetters,      setAllLetters]      = useState<Letter[]>([]);
  const [filteredLetters, setFilteredLetters] = useState<Letter[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState("");

 
  const draft      = allLetters.filter(l => l.status === "draft").length;
  const inProgress = allLetters.filter(l => l.status === "in-progress").length;
  const completed  = allLetters.filter(l => l.status === "completed").length;

  useEffect(() => {
    const fetchDeptTasks = async () => {
      try {
        setLoading(true);
        const res = await api.get("/letters/");
        const all: Letter[] = res.data;

        const decoded = decodeURIComponent(deptName || "");
        const deptTasks =
          decoded === "Unassigned"
            ? all.filter(l => !l.department?.trim())
            : all.filter(l => l.department?.trim() === decoded);

        setAllLetters(deptTasks);
        setFilteredLetters(deptTasks);
      } catch (err) {
        console.error("Error fetching department tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeptTasks();
  }, [deptName]);

  
  useEffect(() => {
    if (!searchTerm.trim()) { setFilteredLetters(allLetters); return; }
    const s = searchTerm.toLowerCase();
    setFilteredLetters(
      allLetters.filter(l =>
        l.ref_no?.toLowerCase().includes(s)     ||
        l.subject?.toLowerCase().includes(s)    ||
        l.category?.toLowerCase().includes(s)   ||
        l.status?.toLowerCase().includes(s)     ||
        l.priority?.toLowerCase().includes(s)   ||
        l.created_by?.toLowerCase().includes(s)
      )
    );
  }, [searchTerm, allLetters]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress sx={{ color: "#1a237e" }} />
      </Box>
    );
  }

  const decoded = decodeURIComponent(deptName || "");

  return (
    <Box sx={{ p: 3, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
          <div>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e", mb: 0.5 }}>
              {decoded} — Tasks
            </Typography>
            <Typography variant="body2" sx={{ color: "#666" }}>
              {filteredLetters.length} of {allLetters.length} tasks shown
            </Typography>
          </div>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/dashboard")}
            sx={{
              borderColor: "#1a237e", color: "#1a237e",
              "&:hover": { borderColor: "#0d47a1", backgroundColor: "#e8eaf6" },
            }}
          >
            Back to Dashboard
          </Button>
        </Box>

        
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          {[
            { label: "Total",       value: allLetters.length, bg: "#e8eaf6", color: "#1a237e" },
            { label: "Draft",       value: draft,             bg: "#f3e5f5", color: "#6a1b9a" },
            { label: "In Progress", value: inProgress,        bg: "#e3f2fd", color: "#1565c0" },
            { label: "Completed",   value: completed,         bg: "#e8f5e9", color: "#2e7d32" },
          ].map(s => (
            <Box
              key={s.label}
              sx={{
                px: 2.5, py: 1, borderRadius: 2,
                backgroundColor: s.bg,
                display: "flex", alignItems: "center", gap: 1,
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 18, color: s.color }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 13, color: s.color, opacity: 0.85 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>

     
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by Subject, Category, Status, Priority, or Created By..."
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
              backgroundColor: "white", borderRadius: 2,
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { borderColor: "#1a237e" },
                "&.Mui-focused fieldset": { borderColor: "#1a237e" },
              },
            }}
          />
        </Box>

  
        <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: "0 4px 6px rgba(0,0,0,0.1)", overflow: "hidden" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#1a237e" }}>
                {[ "Subject", "Category", "Status", "Priority", "Due Date", "Created By"].map(h => (
                  <TableCell key={h} sx={{ color: "white", fontWeight: "bold" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredLetters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 6 }}>
                      <Typography variant="h6" color="text.secondary">
                        {searchTerm ? "No results found" : "No tasks found"}
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
                     

                      <TableCell sx={{ maxWidth: 220 }}>
                        <Typography variant="body2" noWrap>{letter.subject}</Typography>
                      </TableCell>

                      <TableCell>
                        <Chip label={letter.category} size="small" sx={{ backgroundColor: "#e0e0e0", fontWeight: 500 }} />
                      </TableCell>

                      <TableCell>
                        <Chip label={letter.status} size="small"
                          sx={{ backgroundColor: sc.bg, color: sc.text, fontWeight: "bold", textTransform: "capitalize" }} />
                      </TableCell>

                      <TableCell>
                        <Chip label={letter.priority} size="small"
                          sx={{ backgroundColor: pc.bg, color: pc.text, fontWeight: "bold", textTransform: "capitalize" }} />
                      </TableCell>

                      <TableCell>
                        {letter.due_date
                          ? <Typography variant="body2" sx={{ fontWeight: 500, color: "#1a237e" }}>
                              {new Date(letter.due_date).toLocaleDateString()}
                            </Typography>
                          : "—"}
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
}