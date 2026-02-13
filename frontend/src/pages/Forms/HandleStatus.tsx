import React, { useEffect, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  CircularProgress,
  Backdrop,
  Typography,
  TextField,
  FormControl,
  Snackbar,
  Alert,
  Chip,
  Avatar,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
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
}

const HandleStatus: React.FC = () => {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Letter[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fetchLetters = async () => {
    try {
      setLoading(true);
      console.log("📨 Fetching letters for status handling...");

      const res = await api.get("/letters/");

      const nonDraftLetters = res.data.filter((letter: Letter) => {
        const isDraft = letter.status === "draft";
        console.log(`Letter ${letter.ref_no}: status=${letter.status}, isDraft=${isDraft}`);
        return !isDraft;
      });

      setLetters(nonDraftLetters);
      setFiltered(nonDraftLetters);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || "Unable to fetch letters", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  useEffect(() => {
    let temp = [...letters];
    if (search) {
      temp = temp.filter((l) =>
        `${l.ref_no} ${l.subject} ${l.sender} ${l.receiver} ${l.category}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    setFiltered(temp);
  }, [search, letters]);

  const handleStatusChange = async (cycleId: string, newStatus: string) => {
    try {
      setLoading(true);

      const res = await api.patch(`/letters/cycles/${cycleId}/status/`, {
        status: newStatus,
      });

      if (res.status === 200) {
        await fetchLetters();

        setSnackbar({
          open: true,
          message: res.data.message || "Status updated successfully",
          severity: "success",
        });
      }
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Failed to update status",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; text: string }> = {
      completed: { color: "#4caf50", bg: "#e8f5e9", text: "#2e7d32" },
      "in-progress": { color: "#2196f3", bg: "#e3f2fd", text: "#1565c0" },
      overdue: { color: "#f44336", bg: "#ffebee", text: "#c62828" },
    };
    return configs[status] || { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" };
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { color: string; bg: string; text: string }> = {
      urgent: { color: "#f44336", bg: "#ffebee", text: "#c62828" },
      high: { color: "#ff9800", bg: "#fff3e0", text: "#e65100" },
      medium: { color: "#ffc107", bg: "#fff8e1", text: "#f57c00" },
      low: { color: "#4caf50", bg: "#e8f5e9", text: "#2e7d32" },
    };
    return configs[priority] || { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" };
  };

  const getCategoryConfig = (category: string) => {
    const configs: Record<string, { bg: string; text: string }> = {
      "Graphs": { bg: "#e0e7ff", text: "#3730a3" },
      "Data": { bg: "#dbeafe", text: "#1e40af" },
      "Notice": { bg: "#fef3c7", text: "#92400e" },
      "Memo": { bg: "#fce7f3", text: "#831843" },
      "Circular": { bg: "#e0f2fe", text: "#075985" },
      "Letter": { bg: "#dcfce7", text: "#166534" },
    };
    return configs[category] || { bg: "#e0e7ff", text: "#3730a3" };
  };

  return (
    <Box sx={{ p: 3, backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: "1600px", margin: "0 auto" }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar sx={{ bgcolor: "#1a237e", mr: 2, width: 48, height: 48 }}>
              <CheckCircleIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
                Handle Tasks Status
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Search Bar */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 3,
            border: "1px solid #e0e0e0",
            backgroundColor: "#ffffff"
          }}
        >
          <TextField
            fullWidth
            placeholder="Search by Ref No, Subject, Sender, Receiver, or Category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#1a237e" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": {
                  borderColor: "#1a237e",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#1a237e",
                },
              },
            }}
          />
        </Paper>

        {/* Table */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid #e0e0e0",
            overflow: "hidden"
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1a237e" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Ref No
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Cycle
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Subject
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Sender
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Receiver
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Category
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Priority
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Due Date
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Next Due
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Box sx={{ py: 8 }}>
                        <CheckCircleIcon sx={{ fontSize: 64, color: "#bdbdbd", mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                          {search ? "No letters match your search" : "No letters available"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {search
                            ? "Try adjusting your search terms"
                            : "All letters are in draft status or no letters exist"}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((letter, index) => {
                    const statusConfig = getStatusConfig(letter.status);
                    const priorityConfig = getPriorityConfig(letter.priority);
                    const categoryConfig = getCategoryConfig(letter.category);

                    return (
                      <TableRow
                        key={letter._id}
                        hover
                        sx={{
                          backgroundColor: index % 2 === 0 ? "#ffffff" : "#fafafa",
                          "&:hover": {
                            backgroundColor: "#f0f4ff !important",
                          },
                          transition: "background-color 0.2s"
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#1a237e" }}>
                            {letter.ref_no}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={letter.cycle_no || "1"}
                            size="small"
                            sx={{
                              backgroundColor: "#e3f2fd",
                              color: "#1565c0",
                              fontWeight: 600,
                              fontSize: "0.75rem"
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 250 }}>
                          <Tooltip title={letter.subject}>
                            <Typography variant="body2" noWrap>
                              {letter.subject}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{letter.sender}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{letter.receiver}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={letter.category}
                            size="small"
                            sx={{
                              backgroundColor: categoryConfig.bg,
                              color: categoryConfig.text,
                              fontWeight: 500,
                              fontSize: "0.75rem"
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={letter.priority}
                            size="small"
                            sx={{
                              backgroundColor: priorityConfig.bg,
                              color: priorityConfig.text,
                              fontWeight: 600,
                              textTransform: "capitalize",
                              fontSize: "0.75rem",
                              border: `1px solid ${priorityConfig.color}`,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {letter.due_date
                              ? new Date(letter.due_date).toLocaleDateString()
                              : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {letter.next_due_date
                              ? new Date(letter.next_due_date).toLocaleDateString()
                              : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={letter.status}
                              disabled={letter.status === "completed"}
                              onChange={(e) => handleStatusChange(letter._id, e.target.value)}
                              sx={{
                                backgroundColor: statusConfig.bg,
                                color: statusConfig.text,
                                fontWeight: 600,
                                border: `1px solid ${statusConfig.color}`,
                                borderRadius: "8px",
                                "& .MuiOutlinedInput-notchedOutline": {
                                  border: "none",
                                },
                                "&:hover": {
                                  backgroundColor: statusConfig.bg,
                                },
                                "&.Mui-disabled": {
                                  backgroundColor: statusConfig.bg,
                                  color: statusConfig.text,
                                },
                              }}
                            >
                              <MenuItem value="in-progress">
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <span>⏳</span>
                                  <span>In Progress</span>
                                </Box>
                              </MenuItem>
                              <MenuItem value="completed">
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <span>✅</span>
                                  <span>Completed</span>
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert 
          severity={snackbar.severity} 
          sx={{ 
            width: "100%",
            borderRadius: 2,
            boxShadow: 3
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HandleStatus;