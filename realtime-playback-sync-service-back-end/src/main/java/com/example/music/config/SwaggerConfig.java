package com.example.music.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Real-Time Music Streaming API")
                        .description("""
                                REST and WebSocket API for uploading audio files, converting them to HLS,
                                and synchronizing playback across multiple clients in real-time.

                                **WebSocket endpoint:** `ws://localhost:8080/ws` (SockJS/STOMP)
                                - Send sync events to `/app/sync` or `/app/sync/{roomId}`
                                - Subscribe to `/topic/player` or `/topic/player/{roomId}`
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Music Streaming Team")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local development")
                ));
    }
}
