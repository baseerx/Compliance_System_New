import React, { useEffect, useState } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Select, MenuItem, CircularProgress, Backdrop,
  Typography, TextField, FormControl, Snackbar, Alert, Chip,
  Avatar, InputAdornment, Tooltip,
} from "@mui/material";
import SearchIcon      from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import api from "../../api/axios";
import Swal from "sweetalert2";


interface Letter {
  _id: string;
  letter_id: string;
  ref_no: string;
  cycle_no?: number;
  subject: string;
  sender: string;
  receiver: string;
  category: string;
  status: string;
  priority: string;
  due_date: string;
  next_due_date?: string;
  assigned_to?: string;
  assigned_head?: string;
}


const STATUS_CONFIG: Record<string, { color: string; bg: string; text: string }> = {
  completed:    { color: "#4caf50", bg: "#e8f5e9", text: "#2e7d32" },
  "in-progress":{ color: "#2196f3", bg: "#e3f2fd", text: "#1565c0" },
  overdue:      { color: "#f44336", bg: "#ffebee", text: "#c62828" },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; text: string }> = {
  urgent: { color: "#f44336", bg: "#ffebee", text: "#c62828" },
  high:   { color: "#ff9800", bg: "#fff3e0", text: "#e65100" },
  medium: { color: "#ffc107", bg: "#fff8e1", text: "#f57c00" },
  low:    { color: "#4caf50", bg: "#e8f5e9", text: "#2e7d32" },
};

const CATEGORY_CONFIG: Record<string, { bg: string; text: string }> = {
  Graphs:   { bg: "#e0e7ff", text: "#3730a3" },
  Data:     { bg: "#dbeafe", text: "#1e40af" },
  Notice:   { bg: "#fef3c7", text: "#92400e" },
  Memo:     { bg: "#fce7f3", text: "#831843" },
  Circular: { bg: "#e0f2fe", text: "#075985" },
  Letter:   { bg: "#dcfce7", text: "#166534" },
};


const HandleStatus: React.FC = () => {
  const [letters,  setLetters]  = useState<Letter[]>([]);
  const [filtered, setFiltered] = useState<Letter[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean; message: string; severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });


  const fetchLetters = async () => {
    try {
      setLoading(true);
      const res = await api.get("/letters/");

      const actionable = (res.data as Letter[]).filter(l =>
        l.status === "in-progress" || l.status === "overdue"
      );

      setLetters(actionable);
      setFiltered(actionable);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || "Unable to fetch tasks", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLetters(); }, []);

  useEffect(() => {
    if (!search) { setFiltered(letters); return; }
    setFiltered(letters.filter(l =>
      ` ${l.subject} ${l.sender} ${l.receiver} ${l.category}`
        .toLowerCase().includes(search.toLowerCase())
    ));
  }, [search, letters]);


  const handleStatusChange = async (cycleId: string, newStatus: string) => {
    try {
      setLoading(true);
      const res = await api.patch(`/letters/cycles/${cycleId}/status/`, { status: newStatus });

      if (res.status === 200) {
        await fetchLetters();
        setSnackbar({ open: true, message: res.data.message || "Status updated", severity: "success" });
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.error || "Failed to update status", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const sC = (s: string) => STATUS_CONFIG[s]   || { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" };
  const pC = (p: string) => PRIORITY_CONFIG[p] || { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" };
  const cC = (c: string) => CATEGORY_CONFIG[c] || { bg: "#e0e7ff",   text: "#3730a3" };


  return (
    <Box sx={{ p: 3, backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: "1600px", margin: "0 auto" }}>

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar sx={{ bgcolor: "#1a237e", mr: 2, width: 48, height: 48 }}>
              <CheckCircleIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
                Update Task Status
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage in-progress and overdue tasks assigned to you
              </Typography>
            </Box>
          </Box>
        </Box>

     
        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: "1px solid #e0e0e0", backgroundColor: "#fff" }}>
          <TextField fullWidth placeholder="Search by  Subject, Sender, Receiver, or Category…"
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "#1a237e" }} /></InputAdornment>,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { borderColor: "#1a237e" },
                "&.Mui-focused fieldset": { borderColor: "#1a237e" },
              },
            }} />
        </Paper>

   
        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e0e0e0", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1a237e" }}>
                  {[
                     "Cycle", "Subject", "Sender", "Receiver",
                    "Category", "Priority", "Due Date", "Next Due", "Assigned To", "Status",
                  ].map(h => (
                    <TableCell key={h} sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem", whiteSpace: "nowrap" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center">
                      <Box sx={{ py: 8 }}>
                        <CheckCircleIcon sx={{ fontSize: 64, color: "#bdbdbd", mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                          {search ? "No tasks match your search" : "No actionable letters"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {search
                            ? "Try adjusting your search terms"
                            : "Pending tasks need head approval before they appear here"}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((letter, index) => {
                    const sc = sC(letter.status);
                    const pc = pC(letter.priority);
                    const cc = cC(letter.category);

                    return (
                      <TableRow key={letter._id} hover
                        sx={{
                          backgroundColor: index % 2 === 0 ? "#fff" : "#fafafa",
                          "&:hover": { backgroundColor: "#f0f4ff !important" },
                          transition: "background-color 0.2s",
                        }}>

                        <TableCell>
                          <Chip label={letter.cycle_no ?? 1} size="small"
                            sx={{ backgroundColor: "#e3f2fd", color: "#1565c0", fontWeight: 600, fontSize: "0.75rem" }} />
                        </TableCell>

                        <TableCell sx={{ maxWidth: 220 }}>
                          <Tooltip title={letter.subject}>
                            <Typography variant="body2" noWrap>{letter.subject}</Typography>
                          </Tooltip>
                        </TableCell>

                        <TableCell><Typography variant="body2">{letter.sender}</Typography></TableCell>
                        <TableCell><Typography variant="body2">{letter.receiver}</Typography></TableCell>

                        <TableCell>
                          <Chip label={letter.category} size="small"
                            sx={{ backgroundColor: cc.bg, color: cc.text, fontWeight: 500, fontSize: "0.75rem" }} />
                        </TableCell>

                        <TableCell>
                          <Chip label={letter.priority} size="small"
                            sx={{
                              backgroundColor: pc.bg, color: pc.text, fontWeight: 600,
                              textTransform: "capitalize", fontSize: "0.75rem",
                              border: `1px solid ${pc.color}`,
                            }} />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                            {letter.due_date ? new Date(letter.due_date).toLocaleDateString() : "—"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                            {letter.next_due_date ? new Date(letter.next_due_date).toLocaleDateString() : "—"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip label={letter.assigned_to || "—"} size="small" variant="outlined"
                            sx={{ fontSize: "0.7rem", borderColor: "#90caf9", color: "#1565c0" }} />
                        </TableCell>

                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={letter.status}
                              disabled={letter.status === "completed"}
                              onChange={e => handleStatusChange(letter._id, e.target.value)}
                              sx={{
                                backgroundColor: sc.bg, color: sc.text, fontWeight: 600,
                                border: `1px solid ${sc.color}`, borderRadius: "8px",
                                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                                "&:hover":      { backgroundColor: sc.bg },
                                "&.Mui-disabled":{ backgroundColor: sc.bg, color: sc.text },
                              }}>
                              <MenuItem value="in-progress">
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <span>⏳</span><span>In Progress</span>
                                </Box>
                              </MenuItem>
                              <MenuItem value="completed">
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <span>✅</span><span>Completed</span>
                                </Box>
                              </MenuItem>
                              <MenuItem value="overdue">
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <span>🔴</span><span>Overdue</span>
                                </Box>
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>

                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

      </Box>

      <Backdrop open={loading} sx={{ color: "#fff", zIndex: 9999 }}>
        <CircularProgress color="inherit" size={60} />
      </Backdrop>

      <Snackbar open={snackbar.open} autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={snackbar.severity} sx={{ width: "100%", borderRadius: 2, boxShadow: 3 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HandleStatus;