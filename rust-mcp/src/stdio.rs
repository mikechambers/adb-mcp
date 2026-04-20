use anyhow::{Context, Result};
use std::io::{BufRead, BufReader, Read, Write};

pub(crate) fn read_lsp_frame(reader: &mut BufReader<impl Read>) -> Result<Option<Vec<u8>>> {
    let mut content_length = None::<usize>;
    loop {
        let mut line = String::new();
        let bytes = reader.read_line(&mut line)?;
        if bytes == 0 {
            return Ok(None);
        }
        let line_trimmed = line.trim_end_matches(['\r', '\n']);
        if line_trimmed.is_empty() {
            break;
        }
        if let Some(v) = line_trimmed.strip_prefix("Content-Length:") {
            content_length = Some(v.trim().parse::<usize>()?);
        }
    }

    let len = content_length.context("missing Content-Length header")?;
    let mut payload = vec![0u8; len];
    reader.read_exact(&mut payload)?;
    Ok(Some(payload))
}

pub(crate) fn write_lsp_frame(writer: &mut impl Write, payload: &[u8]) -> Result<()> {
    write!(writer, "Content-Length: {}\r\n\r\n", payload.len())?;
    writer.write_all(payload)?;
    writer.flush()?;
    Ok(())
}
