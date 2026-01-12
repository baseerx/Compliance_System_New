import React, { useEffect, useState } from "react";
import {Table,TableBody,TableCell,TableContainer,TableHead,TableRow,Paper,IconButton,Toolbar,Typography,TextField,Select, MenuItem,FormControl,InputLabel, Box,TablePagination,CircularProgress, Backdrop,} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

interface Letter {
  _id: string;
  ref_no: string;
  letter_id?: string; 
  subject: string;
  sender: string;
  receiver: string;
  category: string;
  status: string;
  priority: string;
  due_date: string;
  next_due_date: string;
  file: string | null;
}

const LetterTable: React.FC = () => {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [filtered, setFiltered] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://127.0.0.1:8000/api/letters/");
      setLetters(res.data);
      setFiltered(res.data);
    } catch {
      Swal.fire("Error", "Unable to fetch letters", "error");
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
        `${l.ref_no} ${l.subject} ${l.sender} ${l.receiver}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
    }
    if (status) temp = temp.filter((l) => l.status === status);
    if (priority) temp = temp.filter((l) => l.priority === priority);
    if (category) temp = temp.filter((l) => l.category === category);

    setFiltered(temp);
  }, [search, status, priority, category, letters]);

 const downloadFile = async (id: string) => {
  try {
    const response = await axios.get(
      `http://127.0.0.1:8000/api/letters/${id}/download/`,
      {
        responseType: "blob",
        withCredentials: true,
      }
    );

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "letter_file";
    a.click();

    window.URL.revokeObjectURL(url);
  } catch (err) {
    Swal.fire("Error", "Download failed", "error");
  }
};


  const deleteLetter = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This letter will be deleted permanently!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        await axios.delete(`http://127.0.0.1:8000/api/letters/${id}/delete/`);
        Swal.fire("Deleted!", "Letter removed successfully", "success");
        fetchLetters();
      } catch {
        Swal.fire("Error", "Could not delete letter", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box sx={{ p: 2 }}>

      <Toolbar sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Letters Table
        </Typography>

        <TextField
          label="Search"
          size="small"
          sx={{ width: 200 }}
          onChange={(e) => setSearch(e.target.value)}
              />

      <FormControl size="small" sx={{ width: 150 }}>
        <InputLabel>Status</InputLabel>
        <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="draft">Draft</MenuItem>
          <MenuItem value="in-progress">In Progress</MenuItem>
          <MenuItem value="forwarded">Forwarded</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ width: 150 }}>
        <InputLabel>Priority</InputLabel>
        <Select value={priority} label="Priority" onChange={(e) => setPriority(e.target.value)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="low">Low</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="high">High</MenuItem>
          <MenuItem value="urgent">Urgent</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ width: 150 }}>
        <InputLabel>Category</InputLabel>
        <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Notice">Notice</MenuItem>
          <MenuItem value="Memo">Memo</MenuItem>
          <MenuItem value="Circular">Circular</MenuItem>
          <MenuItem value="Letter">Letter</MenuItem>
        </Select>
      </FormControl>

      </Toolbar>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Reference No</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Sender</TableCell>
              <TableCell>Receiver</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Next Due Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filtered
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <TableRow hover key={row._id}>
                  <TableCell>{row.ref_no}</TableCell>
                  <TableCell>{row.subject}</TableCell>
                  <TableCell>{row.sender}</TableCell>
                  <TableCell>{row.receiver}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.priority}</TableCell>
                  <TableCell>{row.due_date}</TableCell>
                  <TableCell>{row.next_due_date ?? "—"}</TableCell>
                  <TableCell align="center">
                      <IconButton
                            onClick={() => {
                              console.log("🔍 Viewing history for:", row);
                              console.log("🔍 Cycle ID (_id):", row._id);
                              console.log("🔍 Letter ID (letter_id):", row.letter_id);
                              
                              const letterIdForHistory = row.letter_id || row._id;
                              
                              if (!letterIdForHistory || letterIdForHistory.length !== 24) {
                                Swal.fire("Error", `Invalid letter ID: ${letterIdForHistory}`, "error");
                                return;
                              }
                              
                              navigate(`/dashboard/letters/${letterIdForHistory}`);
                            }}
                            title="View History"
                          >
                            <VisibilityIcon color="info" />
                          </IconButton>

                      {row.file && (
                        <IconButton onClick={() => downloadFile(row._id)}>
                          <DownloadIcon color="primary" />
                        </IconButton>
                      )}

                      <IconButton onClick={() => deleteLetter(row._id)}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </TableCell>

                </TableRow>
              ))}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      <Backdrop open={loading} sx={{ color: "#fff", zIndex: 9999 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default LetterTable;
