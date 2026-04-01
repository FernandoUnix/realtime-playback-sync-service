package com.example.music.repository;

import com.example.music.model.HistoryEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistoryEntryRepository extends JpaRepository<HistoryEntry, Long> {

    List<HistoryEntry> findTop50ByOrderByPlayedAtDesc();

    void deleteBySongId(String songId);
}
