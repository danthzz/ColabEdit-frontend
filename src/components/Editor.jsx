import React, { useEffect, useState, useRef, useContext } from 'react';
import io from 'socket.io-client';
import { UserContext } from './UserContext';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';


function Editor() {
    const [content, setContent] = useState('');
    const [userList, setUserList] = useState([]);
    const [currentVersion, setCurrentVersion] = useState(1);
    const [totalVersions, setTotalVersions] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const { userData } = useContext(UserContext);
    const navigate = useNavigate();
    const textAreaRef = useRef(null);
    const baseUrl = 'https://colabedt-backend.onrender.com'
    const socket = io(baseUrl, { transports: ['websocket', 'polling'] });

    useEffect(() => {
        if (!userData) {
            navigate('/');
            return;
        }

        socket.emit('join-document', {
            documentId: 'global',
            username: userData.username,
            token: userData.token
        });

        socket.on('load-document', ({ content, users }) => {
            setContent(content);
            setUserList(users);
        });

        socket.on('receive-changes', (newContent) => {
            console.log('Recebendo alterações:', newContent);
            setContent(newContent);
            console.log(content)
        });

        socket.on('user-list', (newUsers) => {
            if (JSON.stringify(newUsers) !== JSON.stringify(userList)) {
                setUserList(newUsers);
            }
        });

        socket.on('connect', () => {
            console.log('Conectado ao servidor WebSocket');
        });
        
        socket.on('disconnect', () => {
            console.log('Desconectado do servidor WebSocket');
        });

        socket.emit('force-update-user-list');

    }, [userData]);

    const handleChange = (e) => {
        setContent(e.target.value);
        socket.emit('send-changes', { content: e.target.value });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            setCurrentVersion(currentVersion + 1);
            socket.emit('save-document', { content, version: currentVersion });
            const response = await axios.post(`${baseUrl}/api/docs/newDoc`, { content });
            setTotalVersions(response.data.document.versions.length);
            alert('Documento salvo com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar documento:', error);
            alert('Erro ao salvar documento');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = async () => {
        setIsSaving(true);
        try {
            socket.emit('save-document', { content });
            const response = await axios.put(`${baseUrl}/api/docs/version/${currentVersion}`, { content });
            alert('Documento atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar documento:', error);
            alert('Erro ao atualizar documento');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNext = async () => {
        if (currentVersion < totalVersions) {
            const nextVersion = currentVersion + 1;
            try {
                const response = await axios.get(`${baseUrl}/api/docs/version/${nextVersion}`);
                setContent(response.data.version.content);
                setCurrentVersion(nextVersion);
            } catch (error) {
                console.error('Erro ao carregar versão:', error);
            }
        }
    };

    const handleBack = async () => {
        if (currentVersion > 1) {
            const previousVersion = currentVersion - 1;
            try {
                const response = await axios.get(`${baseUrl}/api/docs/version/${previousVersion}`);
                setContent(response.data.version.content);
                setCurrentVersion(previousVersion);
            } catch (error) {
                console.error('Erro ao carregar versão:', error);
            }
        }
    };

    const handleLogout = () => {
        socket.emit('logout');
        localStorage.clear();
        window.location.href = '/';
    };

    return (
        <div className="container-fluid vw-100">
            <h2 className="text-center ">Editor de Markdown - {userData?.username}</h2>
            <div className="row justify-content-center">
                <div className="col-10 col-md-5">
                    <textarea
                        ref={textAreaRef}
                        className="form-control"
                        value={content}
                        onChange={handleChange}
                        rows="10"
                        disabled={isSaving}
                    ></textarea>
                </div>
            </div>
            <div className="row justify-content-center">
                <div className="col-10 col-md-5">
                    <button
                        onClick={currentVersion >= totalVersions ? handleSave : handleEdit}
                        className="btn btn-primary w-100"
                        disabled={isSaving}
                    >
                        {currentVersion >= totalVersions ? 'Salvar Documento' : 'Atualizar Versão'}
                    </button>
                </div>
            </div>
            <div className="row justify-content-center">
                <div className="col-10 col-md-5 d-flex justify-content-between">
                    <button onClick={handleBack} disabled={currentVersion <= 1 || isSaving} className="btn btn-secondary">Back</button>
                    <button onClick={handleNext} disabled={currentVersion >= totalVersions || isSaving} className="btn btn-secondary">Next</button>
                </div>
                <p className="text-center">Versão atual: {currentVersion} de {totalVersions}</p>
            </div>

            <div className="row justify-content-center">
                <div className="col-10 col-md-5">
                    <h3>Pré-visualização:</h3>
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            </div>

            <div className="row justify-content-center">
                <div className="col-10 col-md-5">
                    <h3>Usuários Conectados:</h3>
                    <ul className="list-group">
                        {userList.map((user, index) => (
                            <li key={index} className="list-group-item" style={{ color: user.color }}>{user.username}</li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="row justify-content-center">
                <div className="col-10 col-md-5">
                    <button onClick={handleLogout} className="btn btn-danger w-100">Logout</button>
                </div>
            </div>
        </div>
    );
}

export default Editor;
