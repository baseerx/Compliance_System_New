import React, { useEffect, useState } from "react";
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Select, MenuItem, CircularProgress, Backdrop,
  Typography, TextField, FormControl, Chip, Avatar, InputAdornment,
  Tooltip, Button, IconButton, 
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import GavelIcon from "@mui/icons-material/Gavel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Swal from "sweetalert2";


interface Letter {
  _id: string;
  letter_id: string;
  ref_no: string;
  subject: string;
  sender: string;
  receiver: string;
  category: string;
  priority: string;
  due_date: string;
  file?: string | null;
  assigned_to?: string;
  assigned_head?: string;
  created_by?: string;
}


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

const pC = (p: string) => PRIORITY_CONFIG[p] || { color: "#9e9e9e", bg: "#f5f5f5", text: "#616161" };
const cC = (c: string) => CATEGORY_CONFIG[c] || { bg: "#e0e7ff", text: "#3730a3" };


const ApprovalTasks: React.FC = () => {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [filtered, setFiltered] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();


  const fetchPendingLetters = async () => {
  try {
    setLoading(true);
    const res = await api.get("/letters/");

    const pending = (res.data as any[]).filter(l =>
      l.status === "pending" && l.assigned_head
    );

    setLetters(pending);
    setFiltered(pending);
  } catch (err: any) {
    Swal.fire("Error", err.response?.data?.error || "Unable to fetch pending tasks", "error");
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { fetchPendingLetters(); }, []);


  useEffect(() => {
    if (!search) { setFiltered(letters); return; }
    setFiltered(letters.filter(l =>
      ` ${l.subject} ${l.sender} ${l.receiver} ${l.category}`
        .toLowerCase().includes(search.toLowerCase())
    ));
  }, [search, letters]);


  const handleDecision = async (letterId: string, action: "approve" | "reject") => {
    if (action === "approve") {
      const { isConfirmed } = await Swal.fire({
        title: "Approve Letter?",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#2e7d32",
        confirmButtonText: "Approve",
      });
      if (!isConfirmed) return;

      try {
        setLoading(true);
        await api.post(`/letters/${letterId}/approve/`);
        Swal.fire({
          icon: "success",
          title: "Approved!",
          confirmButtonColor: "#1a237e",
        });
        fetchPendingLetters();
      } catch (err: any) {
        Swal.fire("Error", err.response?.data?.error || "Approval failed", "error");
      } finally { setLoading(false); }

    } else {
     
      const { value: reason, isConfirmed } = await Swal.fire({
        title: "Reject Letter",
        input: "textarea",
        inputLabel: "Reason for rejection (optional)",
        showCancelButton: true,
        confirmButtonColor: "#c62828",
        confirmButtonText: "Reject",
      });
      if (!isConfirmed) return;

      try {
        setLoading(true);
        await api.post(`/letters/${letterId}/reject/`, { reason: reason || "" });
        Swal.fire({
          icon: "info",
          title: "Rejected",
          text: "Letter has been returned to draft .",
          confirmButtonColor: "#1a237e",
        });
        fetchPendingLetters();
      } catch (err: any) {
        Swal.fire("Error", err.response?.data?.error || "Rejection failed", "error");
      } finally { setLoading(false); }
    }
  };

  const downloadFile = async (letterId: string, refNo: string) => {
    try {
      const res = await api.get(`/letters/${letterId}/download/`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `${refNo}_file`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      Swal.fire("Error", err.response?.data?.error || "Download failed", "error");
    }
  };


  return (
    <Box sx={{ p: 3, backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <Box sx={{ maxWidth: "1600px", margin: "0 auto" }}>

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar sx={{ bgcolor: "#1a237e", mr: 2, width: 56, height: 56 }}>
              <GavelIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1a237e" }}>
                Approval Queue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review and approve or reject pending tasks assigned to you
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchPendingLetters}
              sx={{ bgcolor: "#1a237e", "&:hover": { bgcolor: "#0d47a1" } }}>
              Refresh
            </Button>
          </Box>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Chip
              label={`${letters.length} Pending Approval${letters.length !== 1 ? "s" : ""}`}
              sx={{
                backgroundColor: "#fff3e0",
                color: "#e65100",
                fontWeight: 700,
                fontSize: "0.875rem",
                px: 1,
              }}
            />
            {filtered.length !== letters.length && (
              <Chip
                label={`${filtered.length} Match Search`}
                size="small"
                sx={{ backgroundColor: "#e3f2fd", color: "#1565c0", fontWeight: 600 }}
              />
            )}
          </Box>
        </Box>

        <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: "1px solid #e0e0e0" }}>
          <TextField
            fullWidth
            placeholder="Search by Subject, Sender, Receiver, or Category…"
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
                "&:hover fieldset": { borderColor: "#1a237e" },
                "&.Mui-focused fieldset": { borderColor: "#1a237e" },
              },
            }}
          />
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #e0e0e0", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1a237e" }}>
                  {[
                     "Subject", "Sender", "Receiver", "Category",
                    "Priority", "Due Date", "Assigned To", "Created By", "Decision", "Actions",
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
                        {letters.length === 0 ? (
                          <>
                            <CheckCircleIcon sx={{ fontSize: 64, color: "#4caf50", mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                              All Clear!
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              No pending tasks require your approval at this time.
                            </Typography>
                          </>
                        ) : (
                          <>
                            <SearchIcon sx={{ fontSize: 64, color: "#bdbdbd", mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                              No matches found
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Try adjusting your search terms
                            </Typography>
                            <Button
                              variant="outlined"
                              onClick={() => setSearch("")}
                              sx={{ mt: 2 }}>
                              Clear Search
                            </Button>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((letter, index) => {
                    const pc = pC(letter.priority);
                    const cc = cC(letter.category);

                    return (
                      <TableRow
                        key={letter._id}
                        hover
                        sx={{
                          backgroundColor: index % 2 === 0 ? "#fff" : "#fafafa",
                          "&:hover": { backgroundColor: "#fff8e1 !important" },
                          transition: "background-color 0.2s",
                          borderLeft: "4px solid #ff9800",
                        }}>


                        <TableCell sx={{ maxWidth: 220 }}>
                          <Tooltip title={letter.subject}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
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
                              backgroundColor: cc.bg,
                              color: cc.text,
                              fontWeight: 500,
                              fontSize: "0.75rem",
                            }}
                          />
                        </TableCell>

                       
                        <TableCell>
                          <Chip
                            label={letter.priority}
                            size="small"
                            sx={{
                              backgroundColor: pc.bg,
                              color: pc.text,
                              fontWeight: 700,
                              textTransform: "capitalize",
                              fontSize: "0.75rem",
                              border: `1px solid ${pc.color}`,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                            {letter.due_date ? new Date(letter.due_date).toLocaleDateString() : "—"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={letter.assigned_to || "—"}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.7rem", borderColor: "#90caf9", color: "#1565c0" }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                            {letter.created_by || "—"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              displayEmpty
                              value=""
                              onChange={(e) => {
                                const action = e.target.value as "approve" | "reject";
                                if (action) handleDecision(letter.letter_id, action);
                              }}
                              sx={{
                                backgroundColor: "#fff8e1",
                                border: "1px solid #ff9800",
                                borderRadius: "8px",
                                fontWeight: 400,
                                minWidth: 130,
                                "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                              }}>
                              <MenuItem value="" disabled>
                                <Typography sx={{ color: "#e65100", fontWeight: 500 }}>
                                  Take Action 
                                </Typography>
                              </MenuItem>
                              <MenuItem value="approve">
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#2e7d32" }}>
                                  <CheckCircleIcon fontSize="small" />
                                  <span>Approve</span>
                                </Box>
                              </MenuItem>
                              <MenuItem value="reject">
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "#c62828" }}>
                                  <CancelIcon fontSize="small" />
                                  <span>Reject</span>
                                </Box>
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>

                        <TableCell align="center">
                          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
                            <Tooltip title="View History">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/history/${letter.letter_id}`)}
                                sx={{ color: "#1976d2", "&:hover": { backgroundColor: "#e3f2fd" } }}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {letter.file && (
                              <Tooltip title="Download File">
                                <IconButton
                                  size="small"
                                  onClick={() => downloadFile(letter.letter_id, letter.ref_no)}
                                  sx={{ color: "#2e7d32", "&:hover": { backgroundColor: "#e8f5e9" } }}>
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
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
    </Box>
  );
};

export default ApprovalTasks;