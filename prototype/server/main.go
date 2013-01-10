package main

import (
	"./server"
	"net/http"
)

func main() {
	server.SetupMySQL()

	http.HandleFunc("/images/", server.ImageHandler)

	http.HandleFunc("/upload", server.UploadHandler)
	http.HandleFunc("/multiup", server.MultiUploadHandler)

	http.HandleFunc("/ajax/", server.ClientAjax)

	http.HandleFunc("/", server.ClientHandler)

	http.ListenAndServe(":8080", nil)
}
