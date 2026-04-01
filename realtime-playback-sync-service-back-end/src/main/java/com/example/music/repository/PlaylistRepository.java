package com.example.music.repository;

import com.example.music.model.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, String> {

    List<Playlist> findAllByOrderByCreatedAtDesc();
}
